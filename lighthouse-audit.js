const fs = require('fs');
const util = require('util');
const LighthouseCI = require('./lighthouse-ci');
const CI = new LighthouseCI(process.env.LIGHTHOUSE_GITHUB_TOKEN);

const pathToReport = 'report.json';
const allowedTypes = ['performance', 'pwa', 'seo', 'accessibility', 'best-practices'];
const enableComment = process.env.ENABLE_LIGHTHOUSE_COMMENT;
const enableQualityGateLink = process.env.ENABLE_LIGHTHOUSE_QG_LINK;

const GITHUB_PENDING_STATUS = {
  state: 'pending',
  description: 'Auditing PR changes...'
};

// Convert fs.readFile into Promise version of same    
const readFile = util.promisify(fs.readFile);

/**
 * Collects command lines flags and creates settings to run LH CI.
 * @return {!Object} Settings object.
 */
function getConfig() {
  const args = process.argv.slice(2);
  const config = {};

  config.thresholds = {};
  for (var i = 0; i < args.length; i++) {
    let parts = args[i].split('=')
    let type = parts[0]
    let value = parts[1]
    if (allowedTypes.indexOf(type) > -1) {
      config.thresholds[type] = value
    }
  }

  if (enableComment === 'true') {
    config.addComment = true;
  }

  if (enableQualityGateLink === 'true') {
    config.qualityGateUrl = `https://quality-gate.schibsted.io/#/${process.env.TRAVIS_PULL_REQUEST_SLUG}/${process.env.TRAVIS_BUILD_ID}/reports/11`
  }

  config.pr = {
    number: parseInt(process.env.TRAVIS_PULL_REQUEST, 10),
    sha: process.env.TRAVIS_PULL_REQUEST_SHA
  };

  const repoSlug = process.env.TRAVIS_PULL_REQUEST_SLUG;
  if (!repoSlug) {
    throw new Error('This script can only be run on Travis PR requests.');
  }

  config.repo = {
    owner: repoSlug.split('/')[0],
    name: repoSlug.split('/')[1]
  };

  return config;
}

async function lighthouseToGithub() {
  let report, lhr;
  try {
    report = await readFile(pathToReport, 'utf8');
    lhr = JSON.parse(report);
    console.log(LighthouseCI.getOverallScores(lhr))
  } catch (err) {
    console.log('Error reading Lighthouse report json file')
    console.error(err);
    return
  }

  let config = getConfig();

  const prInfo = {
    repo: config.repo.name,
    owner: config.repo.owner,
    number: config.pr.number,
    sha: config.pr.sha
  };

  // TODO run this earlier
  // Update GH status: inform user auditing has started.
  try {
    const status = Object.assign({}, prInfo, GITHUB_PENDING_STATUS);
    await CI.updateGithubStatus(status);
  } catch (err) {
    CI.handleError(err, prInfo);
  }

  try {
    // Assign pass/fail to PR if a min score is provided.
    if (Object.keys(config.thresholds).length) {
      let opts = config.qualityGateUrl ? Object.assign({ target_url: config.qualityGateUrl }, prInfo) : prInfo
      await CI.assignPassFailToPR(lhr, config.thresholds, opts);
    } else {
      await CI.updateGithubStatus(Object.assign({
        description: 'Auditing complete. See scores above.',
        state: 'success'
      }, prInfo));
    }
  } catch (err) {
    CI.handleError(err, prInfo);
  }

  // Post comment on issue with updated LH scores.
  if (config.addComment) {
    try {
      let qgUrl = config.qualityGateUrl ? config.qualityGateUrl : null;
      await CI.postLighthouseComment(prInfo, lhr, config.thresholds, qgUrl);
    } catch (err) {
      console.log('Error posting Lighthouse comment to PR.');
      console.error(err);
    }
  }

  return LighthouseCI.getOverallScores(lhr);
}

lighthouseToGithub()
  .then(data => console.log('Lighthouse score:', data))
  .catch(err => console.log(err))
