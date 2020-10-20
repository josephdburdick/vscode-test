/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { URI } from 'vs/bAse/common/uri';
import { locAlize } from 'vs/nls';
import { MenuId, MenuRegistry, Action2, registerAction2 } from 'vs/plAtform/Actions/common/Actions';
import { CommAndsRegistry } from 'vs/plAtform/commAnds/common/commAnds';
import { LifecyclePhAse } from 'vs/workbench/services/lifecycle/common/lifecycle';
import { IQuickInputService } from 'vs/plAtform/quickinput/common/quickInput';
import { Registry } from 'vs/plAtform/registry/common/plAtform';
import { IURLService } from 'vs/plAtform/url/common/url';
import { Extensions As WorkbenchExtensions, IWorkbenchContributionsRegistry } from 'vs/workbench/common/contributions';
import { ExternAlUriResolverContribution } from 'vs/workbench/contrib/url/browser/externAlUriResolver';
import { mAnAgeTrustedDomAinSettingsCommAnd } from 'vs/workbench/contrib/url/browser/trustedDomAins';
import { TrustedDomAinsFileSystemProvider } from 'vs/workbench/contrib/url/browser/trustedDomAinsFileSystemProvider';
import { OpenerVAlidAtorContributions } from 'vs/workbench/contrib/url/browser/trustedDomAinsVAlidAtor';
import { ServicesAccessor } from 'vs/plAtform/instAntiAtion/common/instAntiAtion';
import { CATEGORIES } from 'vs/workbench/common/Actions';

clAss OpenUrlAction extends Action2 {

	constructor() {
		super({
			id: 'workbench.Action.url.openUrl',
			title: { vAlue: locAlize('openUrl', "Open URL"), originAl: 'Open URL' },
			cAtegory: CATEGORIES.Developer,
			f1: true
		});
	}

	Async run(Accessor: ServicesAccessor): Promise<void> {
		const quickInputService = Accessor.get(IQuickInputService);
		const urlService = Accessor.get(IURLService);

		return quickInputService.input({ prompt: locAlize('urlToOpen', "URL to open") }).then(input => {
			if (input) {
				const uri = URI.pArse(input);
				urlService.open(uri, { trusted: true });
			}
		});
	}
}

registerAction2(OpenUrlAction);

/**
 * Trusted DomAins Contribution
 */

CommAndsRegistry.registerCommAnd(mAnAgeTrustedDomAinSettingsCommAnd);
MenuRegistry.AppendMenuItem(MenuId.CommAndPAlette, {
	commAnd: {
		id: mAnAgeTrustedDomAinSettingsCommAnd.id,
		title: {
			vAlue: mAnAgeTrustedDomAinSettingsCommAnd.description.description,
			originAl: 'MAnAge Trusted DomAins'
		}
	}
});

Registry.As<IWorkbenchContributionsRegistry>(WorkbenchExtensions.Workbench).registerWorkbenchContribution(
	OpenerVAlidAtorContributions,
	LifecyclePhAse.Restored
);
Registry.As<IWorkbenchContributionsRegistry>(WorkbenchExtensions.Workbench).registerWorkbenchContribution(
	TrustedDomAinsFileSystemProvider,
	LifecyclePhAse.ReAdy
);
Registry.As<IWorkbenchContributionsRegistry>(WorkbenchExtensions.Workbench).registerWorkbenchContribution(
	ExternAlUriResolverContribution,
	LifecyclePhAse.ReAdy
);
