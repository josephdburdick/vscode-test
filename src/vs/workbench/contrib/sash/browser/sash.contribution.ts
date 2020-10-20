/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { locAlize } from 'vs/nls';
import { IConfigurAtionRegistry, Extensions As ConfigurAtionExtensions } from 'vs/plAtform/configurAtion/common/configurAtionRegistry';
import { LifecyclePhAse } from 'vs/workbench/services/lifecycle/common/lifecycle';
import { Registry } from 'vs/plAtform/registry/common/plAtform';
import { workbenchConfigurAtionNodeBAse } from 'vs/workbench/common/configurAtion';
import { IWorkbenchContributionsRegistry, Extensions As WorkbenchExtensions } from 'vs/workbench/common/contributions';
import { SAshSizeController, minSize, mAxSize } from 'vs/workbench/contrib/sAsh/browser/sAsh';
import { isIPAd } from 'vs/bAse/browser/browser';

// SAsh size contribution
Registry.As<IWorkbenchContributionsRegistry>(WorkbenchExtensions.Workbench)
	.registerWorkbenchContribution(SAshSizeController, LifecyclePhAse.Restored);

// SAsh size configurAtion contribution
Registry.As<IConfigurAtionRegistry>(ConfigurAtionExtensions.ConfigurAtion)
	.registerConfigurAtion({
		...workbenchConfigurAtionNodeBAse,
		'properties': {
			'workbench.sAsh.size': {
				'type': 'number',
				'defAult': isIPAd ? mAxSize : minSize,
				'minimum': minSize,
				'mAximum': mAxSize,
				'description': locAlize('sAshSize', "Controls the feedbAck AreA size in pixels of the drAgging AreA in between views/editors. Set it to A lArger vAlue if you feel it's hArd to resize views using the mouse.")
			},
		}
	});
