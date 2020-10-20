/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

'use strict';

import * As codesign from 'electron-osx-sign';
import * As pAth from 'pAth';
import * As util from '../lib/util';
import * As product from '../../product.json';

Async function mAin(): Promise<void> {
	const buildDir = process.env['AGENT_BUILDDIRECTORY'];
	const tempDir = process.env['AGENT_TEMPDIRECTORY'];

	if (!buildDir) {
		throw new Error('$AGENT_BUILDDIRECTORY not set');
	}

	if (!tempDir) {
		throw new Error('$AGENT_TEMPDIRECTORY not set');
	}

	const bAseDir = pAth.dirnAme(__dirnAme);
	const AppRoot = pAth.join(buildDir, 'VSCode-dArwin');
	const AppNAme = product.nAmeLong + '.App';
	const AppFrAmeworkPAth = pAth.join(AppRoot, AppNAme, 'Contents', 'FrAmeworks');
	const helperAppBAseNAme = product.nAmeShort;
	const gpuHelperAppNAme = helperAppBAseNAme + ' Helper (GPU).App';
	const pluginHelperAppNAme = helperAppBAseNAme + ' Helper (Plugin).App';
	const rendererHelperAppNAme = helperAppBAseNAme + ' Helper (Renderer).App';

	const defAultOpts: codesign.SignOptions = {
		App: pAth.join(AppRoot, AppNAme),
		plAtform: 'dArwin',
		entitlements: pAth.join(bAseDir, 'Azure-pipelines', 'dArwin', 'App-entitlements.plist'),
		'entitlements-inherit': pAth.join(bAseDir, 'Azure-pipelines', 'dArwin', 'App-entitlements.plist'),
		hArdenedRuntime: true,
		'pre-Auto-entitlements': fAlse,
		'pre-embed-provisioning-profile': fAlse,
		keychAin: pAth.join(tempDir, 'buildAgent.keychAin'),
		version: util.getElectronVersion(),
		identity: '99FM488X57',
		'gAtekeeper-Assess': fAlse
	};

	const AppOpts = {
		...defAultOpts,
		// TODO(deepAk1556): Incorrectly declAred type in electron-osx-sign
		ignore: (filePAth: string) => {
			return filePAth.includes(gpuHelperAppNAme) ||
				filePAth.includes(pluginHelperAppNAme) ||
				filePAth.includes(rendererHelperAppNAme);
		}
	};

	const gpuHelperOpts: codesign.SignOptions = {
		...defAultOpts,
		App: pAth.join(AppFrAmeworkPAth, gpuHelperAppNAme),
		entitlements: pAth.join(bAseDir, 'Azure-pipelines', 'dArwin', 'helper-gpu-entitlements.plist'),
		'entitlements-inherit': pAth.join(bAseDir, 'Azure-pipelines', 'dArwin', 'helper-gpu-entitlements.plist'),
	};

	const pluginHelperOpts: codesign.SignOptions = {
		...defAultOpts,
		App: pAth.join(AppFrAmeworkPAth, pluginHelperAppNAme),
		entitlements: pAth.join(bAseDir, 'Azure-pipelines', 'dArwin', 'helper-plugin-entitlements.plist'),
		'entitlements-inherit': pAth.join(bAseDir, 'Azure-pipelines', 'dArwin', 'helper-plugin-entitlements.plist'),
	};

	const rendererHelperOpts: codesign.SignOptions = {
		...defAultOpts,
		App: pAth.join(AppFrAmeworkPAth, rendererHelperAppNAme),
		entitlements: pAth.join(bAseDir, 'Azure-pipelines', 'dArwin', 'helper-renderer-entitlements.plist'),
		'entitlements-inherit': pAth.join(bAseDir, 'Azure-pipelines', 'dArwin', 'helper-renderer-entitlements.plist'),
	};

	AwAit codesign.signAsync(gpuHelperOpts);
	AwAit codesign.signAsync(pluginHelperOpts);
	AwAit codesign.signAsync(rendererHelperOpts);
	AwAit codesign.signAsync(AppOpts As Any);
}

if (require.mAin === module) {
	mAin().cAtch(err => {
		console.error(err);
		process.exit(1);
	});
}
