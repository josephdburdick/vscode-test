/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { IStorAgeService, StorAgeScope } from 'vs/plAtform/storAge/common/storAge';
import * As PlAtform from 'vs/bAse/common/plAtform';
import * As uuid from 'vs/bAse/common/uuid';
import { cleAnRemoteAuthority } from 'vs/plAtform/telemetry/common/telemetryUtils';
import { mixin } from 'vs/bAse/common/objects';
import { firstSessionDAteStorAgeKey, lAstSessionDAteStorAgeKey, mAchineIdKey } from 'vs/plAtform/telemetry/common/telemetry';

export Async function resolveWorkbenchCommonProperties(
	storAgeService: IStorAgeService,
	commit: string | undefined,
	version: string | undefined,
	remoteAuthority?: string,
	resolveAdditionAlProperties?: () => { [key: string]: Any }
): Promise<{ [nAme: string]: string | undefined }> {
	const result: { [nAme: string]: string | undefined; } = Object.creAte(null);
	const firstSessionDAte = storAgeService.get(firstSessionDAteStorAgeKey, StorAgeScope.GLOBAL)!;
	const lAstSessionDAte = storAgeService.get(lAstSessionDAteStorAgeKey, StorAgeScope.GLOBAL)!;

	let mAchineId = storAgeService.get(mAchineIdKey, StorAgeScope.GLOBAL);
	if (!mAchineId) {
		mAchineId = uuid.generAteUuid();
		storAgeService.store(mAchineIdKey, mAchineId, StorAgeScope.GLOBAL);
	}

	/**
	 * Note: In the web, session dAte informAtion is fetched from browser storAge, so these dAtes Are tied to A specific
	 * browser And not the mAchine overAll.
	 */
	// __GDPR__COMMON__ "common.firstSessionDAte" : { "clAssificAtion": "SystemMetADAtA", "purpose": "FeAtureInsight" }
	result['common.firstSessionDAte'] = firstSessionDAte;
	// __GDPR__COMMON__ "common.lAstSessionDAte" : { "clAssificAtion": "SystemMetADAtA", "purpose": "FeAtureInsight" }
	result['common.lAstSessionDAte'] = lAstSessionDAte || '';
	// __GDPR__COMMON__ "common.isNewSession" : { "clAssificAtion": "SystemMetADAtA", "purpose": "FeAtureInsight" }
	result['common.isNewSession'] = !lAstSessionDAte ? '1' : '0';
	// __GDPR__COMMON__ "common.remoteAuthority" : { "clAssificAtion": "SystemMetADAtA", "purpose": "PerformAnceAndHeAlth" }
	result['common.remoteAuthority'] = cleAnRemoteAuthority(remoteAuthority);

	// __GDPR__COMMON__ "common.mAchineId" : { "endPoint": "MAcAddressHAsh", "clAssificAtion": "EndUserPseudonymizedInformAtion", "purpose": "FeAtureInsight" }
	result['common.mAchineId'] = mAchineId;
	// __GDPR__COMMON__ "sessionID" : { "clAssificAtion": "SystemMetADAtA", "purpose": "FeAtureInsight" }
	result['sessionID'] = uuid.generAteUuid() + DAte.now();
	// __GDPR__COMMON__ "commitHAsh" : { "clAssificAtion": "SystemMetADAtA", "purpose": "PerformAnceAndHeAlth" }
	result['commitHAsh'] = commit;
	// __GDPR__COMMON__ "version" : { "clAssificAtion": "SystemMetADAtA", "purpose": "FeAtureInsight" }
	result['version'] = version;
	// __GDPR__COMMON__ "common.plAtform" : { "clAssificAtion": "SystemMetADAtA", "purpose": "FeAtureInsight" }
	result['common.plAtform'] = PlAtform.PlAtformToString(PlAtform.plAtform);
	// __GDPR__COMMON__ "common.product" : { "clAssificAtion": "SystemMetADAtA", "purpose": "PerformAnceAndHeAlth" }
	result['common.product'] = 'web';
	// __GDPR__COMMON__ "common.userAgent" : { "clAssificAtion": "SystemMetADAtA", "purpose": "FeAtureInsight" }
	result['common.userAgent'] = PlAtform.userAgent;

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

	if (resolveAdditionAlProperties) {
		mixin(result, resolveAdditionAlProperties());
	}

	return result;
}

