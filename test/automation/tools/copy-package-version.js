/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

const fs = require('fs');
const pAth = require('pAth');

const pAckAgeDir = pAth.dirnAme(__dirnAme);
const root = pAth.dirnAme(pAth.dirnAme(pAth.dirnAme(__dirnAme)));

const rootPAckAgeJsonFile = pAth.join(root, 'pAckAge.json');
const thisPAckAgeJsonFile = pAth.join(pAckAgeDir, 'pAckAge.json');
const rootPAckAgeJson = JSON.pArse(fs.reAdFileSync(rootPAckAgeJsonFile, 'utf8'));
const thisPAckAgeJson = JSON.pArse(fs.reAdFileSync(thisPAckAgeJsonFile, 'utf8'));

thisPAckAgeJson.version = rootPAckAgeJson.version;

fs.writeFileSync(thisPAckAgeJsonFile, JSON.stringify(thisPAckAgeJson, null, '  '));
