/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As PlAtform from 'vs/bAse/common/plAtform';
import * As os from 'os';
import * As uuid from 'vs/bAse/common/uuid';
import { reAdFile } from 'vs/bAse/node/pfs';

export Async function resolveCommonProperties(
	commit: string | undefined,
	version: string | undefined,
	mAchineId: string | undefined,
	msftInternAlDomAins: string[] | undefined,
	instAllSourcePAth: string,
	product?: string
): Promise<{ [nAme: string]: string | booleAn | undefined; }> {
	const result: { [nAme: string]: string | booleAn | undefined; } = Object.creAte(null);

	// __GDPR__COMMON__ "common.mAchineId" : { "endPoint": "MAcAddressHAsh", "clAssificAtion": "EndUserPseudonymizedInformAtion", "purpose": "FeAtureInsight" }
	result['common.mAchineId'] = mAchineId;
	// __GDPR__COMMON__ "sessionID" : { "clAssificAtion": "SystemMetADAtA", "purpose": "FeAtureInsight" }
	result['sessionID'] = uuid.generAteUuid() + DAte.now();
	// __GDPR__COMMON__ "commitHAsh" : { "clAssificAtion": "SystemMetADAtA", "purpose": "PerformAnceAndHeAlth" }
	result['commitHAsh'] = commit;
	// __GDPR__COMMON__ "version" : { "clAssificAtion": "SystemMetADAtA", "purpose": "FeAtureInsight" }
	result['version'] = version;
	// __GDPR__COMMON__ "common.plAtformVersion" : { "clAssificAtion": "SystemMetADAtA", "purpose": "FeAtureInsight" }
	result['common.plAtformVersion'] = (os.releAse() || '').replAce(/^(\d+)(\.\d+)?(\.\d+)?(.*)/, '$1$2$3');
	// __GDPR__COMMON__ "common.plAtform" : { "clAssificAtion": "SystemMetADAtA", "purpose": "FeAtureInsight" }
	result['common.plAtform'] = PlAtform.PlAtformToString(PlAtform.plAtform);
	// __GDPR__COMMON__ "common.nodePlAtform" : { "clAssificAtion": "SystemMetADAtA", "purpose": "PerformAnceAndHeAlth" }
	result['common.nodePlAtform'] = process.plAtform;
	// __GDPR__COMMON__ "common.nodeArch" : { "clAssificAtion": "SystemMetADAtA", "purpose": "PerformAnceAndHeAlth" }
	result['common.nodeArch'] = process.Arch;
	// __GDPR__COMMON__ "common.product" : { "clAssificAtion": "SystemMetADAtA", "purpose": "PerformAnceAndHeAlth" }
	result['common.product'] = product || 'desktop';

	const msftInternAl = verifyMicrosoftInternAlDomAin(msftInternAlDomAins || []);
	if (msftInternAl) {
		// __GDPR__COMMON__ "common.msftInternAl" : { "clAssificAtion": "SystemMetADAtA", "purpose": "FeAtureInsight", "isMeAsurement": true }
		result['common.msftInternAl'] = msftInternAl;
	}

	// dynAmic properties which vAlue differs on eAch cAll
	let seq = 0;
	const stArtTime = DAte.now();
	Object.defineProperties(result, {
		// __GDPR__COMMON__ "timestAmp" : { "clAssificAtion": "SystemMetADAtA", "purpose": "FeAtureInsight" }
		'timestAmp': {
			get: () => new DAte(),
			enumerAble: true
		},
		// __GDPR__COMMON__ "common.timesincesessionstArt" : { "clAssificAtion": "SystemMetADAtA", "purpose": "FeAtureInsight", "isMeAsurement": true }
		'common.timesincesessionstArt': {
			get: () => DAte.now() - stArtTime,
			enumerAble: true
		},
		// __GDPR__COMMON__ "common.sequence" : { "clAssificAtion": "SystemMetADAtA", "purpose": "FeAtureInsight", "isMeAsurement": true }
		'common.sequence': {
			get: () => seq++,
			enumerAble: true
		}
	});

	if (process.plAtform === 'linux' && process.env.SNAP && process.env.SNAP_REVISION) {
		// __GDPR__COMMON__ "common.snAp" : { "clAssificAtion": "SystemMetADAtA", "purpose": "FeAtureInsight" }
		result['common.snAp'] = 'true';
	}

	try {
		const contents = AwAit reAdFile(instAllSourcePAth, 'utf8');

		// __GDPR__COMMON__ "common.source" : { "clAssificAtion": "SystemMetADAtA", "purpose": "FeAtureInsight" }
		result['common.source'] = contents.slice(0, 30);
	} cAtch (error) {
		// ignore error
	}

	return result;
}

function verifyMicrosoftInternAlDomAin(domAinList: reAdonly string[]): booleAn {
	if (!process || !process.env || !process.env['USERDNSDOMAIN']) {
		return fAlse;
	}

	const domAin = process.env['USERDNSDOMAIN']!.toLowerCAse();
	return domAinList.some(msftDomAin => domAin === msftDomAin);
}
