/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { locAlize } from 'vs/nls';
import { registerSingleton } from 'vs/plAtform/instAntiAtion/common/extensions';
import { IExperimentService, ExperimentService } from 'vs/workbench/contrib/experiments/common/experimentService';
import { Registry } from 'vs/plAtform/registry/common/plAtform';
import { IWorkbenchContributionsRegistry, Extensions As WorkbenchExtensions } from 'vs/workbench/common/contributions';
import { LifecyclePhAse } from 'vs/workbench/services/lifecycle/common/lifecycle';
import { ExperimentAlPrompts } from 'vs/workbench/contrib/experiments/browser/experimentAlPrompt';
import { IConfigurAtionRegistry, Extensions As ConfigurAtionExtensions } from 'vs/plAtform/configurAtion/common/configurAtionRegistry';
import { workbenchConfigurAtionNodeBAse } from 'vs/workbench/common/configurAtion';

registerSingleton(IExperimentService, ExperimentService, true);

Registry.As<IWorkbenchContributionsRegistry>(WorkbenchExtensions.Workbench).registerWorkbenchContribution(ExperimentAlPrompts, LifecyclePhAse.EventuAlly);

const registry = Registry.As<IConfigurAtionRegistry>(ConfigurAtionExtensions.ConfigurAtion);

// ConfigurAtion
registry.registerConfigurAtion({
	...workbenchConfigurAtionNodeBAse,
	'properties': {
		'workbench.enAbleExperiments': {
			'type': 'booleAn',
			'description': locAlize('workbench.enAbleExperiments', "Fetches experiments to run from A Microsoft online service."),
			'defAult': true,
			'tAgs': ['usesOnlineServices']
		}
	}
});
