//
//  Copyright 2018 Draios Inc.
//
//  Licensed under the Apache License, Version 2.0 (the "License");
//  you may not use this file except in compliance with the License.
//  You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
//  Unless required by applicable law or agreed to in writing, software
//  distributed under the License is distributed on an "AS IS" BASIS,
//  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
//  See the License for the specific language governing permissions and
//  limitations under the License.
//
"use strict";

const axios = require("axios");
const Handlebars = require("Handlebars");
const nodemailer = require("nodemailer");
const moment = require("moment");
const minimist = require("minimist");
const fs = require("fs");

main(process.argv.slice(2));

async function main(args) {
  //
  // Get parameters
  //
  console.info("Reading parameters...");
  const params = parseParameters(args);

  //
  // Fetch data
  //
  console.info("Fetching data...");

  const apiAdapter = axios.create({
    baseURL: params.sysdigUrl,
    timeout: 30000,
    headers: {
      "X-Sysdig-Product": "SDS",
      Authorization: `Bearer ${params.sysdigToken}`
    }
  });

  const data = await fetchData(apiAdapter, params);

  //
  // Define template context
  //
  console.info("Defining email context...");
  const context = defineContext(data, params);

  //
  // Mix data and template
  //
  console.info("Creating email content...");
  initializeRendering();
  const subject = await buildContent(
    context,
    "./templates/image-scan-result-subject.hbs",
    params
  );
  const text = await buildContent(
    context,
    "./templates/image-scan-result-text.hbs",
    params
  );
  const html = await buildContent(
    {
      ...context,
      textSummary: text.replace(/\n/g, ""),
      subject: subject.replace(/\n/g, "")
    },
    "./templates/image-scan-result-html.hbs",
    params
  );

  //
  // Send email
  //
  console.info("Sending email...");
  await sendEmail({ subject, textContent: text, htmlContent: html }, params);

  console.info("All done!");
}

function parseParameters(args) {
  const argv = minimist(args);

  return {
    sysdigUrl: getParam(argv, "sysdig-url"),
    sysdigToken: getParam(argv, "sysdig-token"),
    assetsBaseUrl: "https://download.sysdig.com/assets/",

    recipients: Array.isArray(getParam(argv, "recipient"))
      ? getParam(argv, "recipient")
      : [getParam(argv, "recipient")],
    sender: getParam(argv, "sender", "notifications@sysdig.com"),

    smtpHost: getParam(argv, "smtp-host"),
    smtpPort: getParam(argv, "smtp-port", 25),
    smtpUser: getParam(argv, "smtp-user"),
    smtpPass: getParam(argv, "smtp-pass"),

    imageId: getParam(argv, "image")
  };

  function getParam(argv, name, defValue) {
    if (argv[name] === undefined && defValue === undefined) {
      throw `Arguments '${name}' is required`;
    }

    return argv[name] || defValue;
  }
}

async function fetchData(apiAdapter, params) {
  const imageDataResponse = await apiAdapter.get(
    `/api/scanning/v1/anchore/images/${params.imageId}`
  );
  const imageData = parseImageData(imageDataResponse.data);

  const scanResultDataResponse = await apiAdapter.get(
    `/api/scanning/v1/anchore/images/${params.imageId}/check`,
    {
      params: {
        tag: imageData.fullTag,
        details: true,
        history: true
      }
    }
  );
  const scanResultData = parseScanResultData(scanResultDataResponse.data);

  const vulnerabilitiesDataResponse = await apiAdapter.get(
    `/api/scanning/v1/anchore/images/${params.imageId}/vuln/os`
  );
  const vulnerabilitiesData = parseVulnerabilitiesData(
    vulnerabilitiesDataResponse.data
  );

  return {
    image: imageData,
    scanResult: scanResultData,
    vulnerabilities: vulnerabilitiesData
  };

  function parseImageData(data) {
    return {
      fullTag: data[0].image_detail[0].fulltag,
      repo: data[0].image_detail[0].repo,
      id: data[0].image_detail[0].imageId,
      createdAt: data[0].image_detail[0].created_at,
      os: data[0].image_content.metadata.distro,
      osVersion: data[0].image_content.metadata.distro_version,
      size: data[0].image_content.metadata.image_size
    };
  }

  function parseScanResultData(data) {
    const root = data[0];
    const imageData = root[Object.keys(root)[0]];
    const scanResults = imageData[Object.keys(imageData)[0]];
    const latestScan = scanResults[0];

    const scanResultObj = latestScan.detail.result.result;
    const scanResult = scanResultObj[Object.keys(scanResultObj)[0]];

    const rowHeaders = scanResult.result.header;
    const rows = scanResult.result.rows.map(row => {
      return {
        gateAction: row[rowHeaders.indexOf("Gate_Action")],
        trigger: row[rowHeaders.indexOf("Trigger")],
        gate: row[rowHeaders.indexOf("Gate")],
        output: row[rowHeaders.indexOf("Check_Output")],
        isStop: row[rowHeaders.indexOf("Gate_Action")] === "stop",
        isWarn: row[rowHeaders.indexOf("Gate_Action")] === "warn"
      };
    });

    const policyId = latestScan.detail.result.matched_mapping_rule.policy_id;
    const policy = latestScan.detail.policy.policies.find(
      policy => policy.id === policyId
    );

    return {
      status: latestScan.status,
      isFail: latestScan.status === "fail",
      isPass: latestScan.status === "pass",
      evaluatedAt: latestScan.last_evaluation,
      policy: parseScanResultPolicy(policy),
      rows,
      stopRows: rows.filter(row => row.gateAction === "stop"),
      warnRows: rows.filter(row => row.gateAction === "warn")
    };
  }

  function parseScanResultPolicy(data) {
    return {
      name: data.name
    };
  }

  function parseVulnerabilitiesData(data) {
    const vulnerabilities = data.vulnerabilities
      .map(parseVulnerability)
      .filter(
        vulnerability =>
          vulnerability.fix !== "None" &&
          ["High", "Medium"].indexOf(vulnerability.severity) >= 0
      )
      .sort((a, b) => {
        const severities = ["High", "Medium"];
        const severitySort =
          severities.indexOf(a.severity) - severities.indexOf(b.severity);
        if (severitySort !== 0) {
          return severitySort;
        }

        return a.cve.localeCompare(b.cve);
      });

    return {
      list: vulnerabilities.slice(0, 5),
      count: data.vulnerabilities.length,
      hasMore: data.vulnerabilities.length > 5
    };
  }

  function parseVulnerability(data) {
    return {
      cve: data.vuln,
      severity: data.severity,
      packageName: data.package_name,
      packageVersion: data.package_version,
      fixVersion: data.fix,
      cveLink: data.url
    };
  }
}

function defineContext(data, params) {
  return {
    sysdigUrl: params.sysdigUrl,
    assetsBaseUrl: params.assetsBaseUrl,
    ...data
  };
}

async function buildContent(context, templateFilePath, params) {
  const templateSource = await readFile(templateFilePath);

  const template = Handlebars.compile(templateSource);
  const html = template(context);

  return html;
}

function initializeRendering() {
  Handlebars.registerHelper("timestampToString", function(timestamp) {
    return moment(timestamp).format("MMMM Do YYYY, h:mm:ss a");
  });
}

async function sendEmail(content, params) {
  const transporter = nodemailer.createTransport({
    host: params.smtpHost,
    port: params.smtpPort,
    secure: params.smtpPort === 465,
    auth: {
      user: params.smtpUser,
      pass: params.smtpPass
    }
  });

  // setup email data with unicode symbols
  const mailOptions = {
    from: params.sender,
    to: params.recipients.join(", "),
    subject: content.subject,
    text: content.textContent,
    html: content.htmlContent
  };

  // send mail with defined transport object
  const result = await promisify(
    transporter,
    transporter.sendMail,
    mailOptions
  );

  console.log("Message sent: %s", result.messageId);
}

async function readFile(filePath) {
  return promisify(fs, fs.readFile, filePath, "utf8");
}

async function promisify(target, fn, ...args) {
  return new Promise((resolve, reject) => {
    fn.call(target, ...args, function(error, data) {
      if (error) {
        reject(error);
      } else {
        resolve(data);
      }
    });
  });
}
