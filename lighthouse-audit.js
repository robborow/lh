const fs = require('fs');
const util = require('util');
const LighthouseCI = require('./lighthouse-ci');

const pathToReport = 'report.json';
const allowedTypes = ['performance', 'pwa', 'seo', 'accessibility', 'best-practices'];

// Convert fs.readFile into Promise version of same    
const readFile = util.promisify(fs.readFile);

/**
 * Collects command lines flags and creates settings to run LH CI.
 * @return {!Object} Settings object.
 */
function getConfig() {
  const args = process.argv.slice(2);
  // const argv = minimist(args, {
  //   boolean: ['comment', 'help'],
  //   default: {comment: true},
  //   alias: {help: 'h'}
  // });
  const config = {};
  console.log(args)

  config.thresholds = {};
  for (var i = 0; i < args.length; i++) {
    let parts = args[i].split('=')
    let type = parts[0]
    let value = parts[1]
    if (allowedTypes.indexOf(type) > -1) {
      config.thresholds[type] = value
    }
  }

  // DESSA SÄTTS AUTOMATISKT AV TRAVIS - FEJKA DETTA FÖR ATT SE ATT DET FUNKAR! (ALT PROVA I robborow/lh)
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
  let report = await readFile(pathToReport, 'utf8');
  let lhr = JSON.parse(report);

  let config = getConfig();

  // // denna info kommer från runlighthouse.js i root, hur får jag det här?
  // const config = Object.assign({}, req.body);
  // const prInfo = {
  //   repo: config.repo.name,
  //   owner: config.repo.owner,
  //   number: config.pr.number,
  //   sha: config.pr.sha
  // };

  // // DENNA BORDE EGENTLIGEN KÖRAS I BÖRJAN AV run-lighthouse.js PÅ NÅGOT SÄTT
  // // Update GH status: inform user auditing has started.
  // try {
  //   const status = Object.assign({}, prInfo, GITHUB_PENDING_STATUS);
  //   await CI.updateGithubStatus(status);
  // } catch (err) {
  //   CI.handleError(err, prInfo);
  // }

  // // BEHÖVER INTE KÖRAS, HAR REDAN SCORE I REPORT VARIABELN (så 'lhr' === 'report'?)
  // // Run Lighthouse CI against the PR changes.
  // // let lhr;
  // // try {
  // //   const headers = {[API_KEY_HEADER]: req.get(API_KEY_HEADER)};
  // //   lhr = await CI.testOnHeadlessChrome(
  // //     {output: config.output, url: config.testUrl}, headers);
  // // } catch (err) {
  // //   CI.handleError(err, prInfo);
  // //   res.json(`Error from CI backend. ${err.message}`);
  // //   return; // Treat a LH error as fatal. Do not proceed.
  // // }

  // try {

  //   // HANTERA DETTA PÅ NÅTT BRA SÄTT (passa in variabler till 'npm run lighthouse-audit'?)
  //   // Assign pass/fail to PR if a min score is provided.
  //   if (Object.keys(config.thresholds).length) {
  //     await CI.assignPassFailToPR(lhr, config.thresholds, Object.assign({
  //       target_url: config.testUrl
  //     }, prInfo));
  //   } else {
  //     await CI.updateGithubStatus(Object.assign({
  //       description: 'Auditing complete. See scores above.',
  //       state: 'success'
  //     }, prInfo));
  //   }
  // } catch (err) {
  //   CI.handleError(err, prInfo);
  // }

  // ISTÄLLET FÖR DENNA, ANVÄND DESCRIPTION BÄTTRE I GITHUB API: PR STATUSES
  // // Post comment on issue with updated LH scores.
  // if (config.addComment) {
  //   try {
  //     await CI.postLighthouseComment(prInfo, lhr, config.thresholds);
  //   } catch (err) {
  //     res.json('Error posting Lighthouse comment to PR.');
  //   }
  // }

  const scores = LighthouseCI.getOverallScores(lhr);

  return scores;
}

// Can't use `await` outside of an async function so you need to chain
// with then()
lighthouseToGithub()
  .then(data => {
    console.log(data);
  })
  .catch(err => console.log(err))
