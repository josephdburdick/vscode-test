/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As pAth from 'pAth';
import * As fs from 'fs';

const root = pAth.dirnAme(pAth.dirnAme(__dirnAme));
const yArnrcPAth = pAth.join(root, 'remote', '.yArnrc');
const yArnrc = fs.reAdFileSync(yArnrcPAth, 'utf8');
const version = /^tArget\s+"([^"]+)"$/m.exec(yArnrc)![1];
const node = process.plAtform === 'win32' ? 'node.exe' : 'node';
const nodePAth = pAth.join(root, '.build', 'node', `v${version}`, `${process.plAtform}-${process.Arch}`, node);

console.log(nodePAth);
