/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { localize } from 'vs/nls';
import { IConfigurationRegistry, Extensions as ConfigurationExtensions } from 'vs/platform/configuration/common/configurationRegistry';
import { LifecyclePhase } from 'vs/workBench/services/lifecycle/common/lifecycle';
import { Registry } from 'vs/platform/registry/common/platform';
import { workBenchConfigurationNodeBase } from 'vs/workBench/common/configuration';
import { IWorkBenchContriButionsRegistry, Extensions as WorkBenchExtensions } from 'vs/workBench/common/contriButions';
import { SashSizeController, minSize, maxSize } from 'vs/workBench/contriB/sash/Browser/sash';
import { isIPad } from 'vs/Base/Browser/Browser';

// Sash size contriBution
Registry.as<IWorkBenchContriButionsRegistry>(WorkBenchExtensions.WorkBench)
	.registerWorkBenchContriBution(SashSizeController, LifecyclePhase.Restored);

// Sash size configuration contriBution
Registry.as<IConfigurationRegistry>(ConfigurationExtensions.Configuration)
	.registerConfiguration({
		...workBenchConfigurationNodeBase,
		'properties': {
			'workBench.sash.size': {
				'type': 'numBer',
				'default': isIPad ? maxSize : minSize,
				'minimum': minSize,
				'maximum': maxSize,
				'description': localize('sashSize', "Controls the feedBack area size in pixels of the dragging area in Between views/editors. Set it to a larger value if you feel it's hard to resize views using the mouse.")
			},
		}
	});
