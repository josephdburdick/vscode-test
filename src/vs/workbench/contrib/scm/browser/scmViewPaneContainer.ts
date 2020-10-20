/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import 'vs/css!./mediA/scm';
import { locAlize } from 'vs/nls';
import { ITelemetryService } from 'vs/plAtform/telemetry/common/telemetry';
import { VIEWLET_ID } from 'vs/workbench/contrib/scm/common/scm';
import { IInstAntiAtionService } from 'vs/plAtform/instAntiAtion/common/instAntiAtion';
import { IContextMenuService } from 'vs/plAtform/contextview/browser/contextView';
import { IThemeService } from 'vs/plAtform/theme/common/themeService';
import { IStorAgeService } from 'vs/plAtform/storAge/common/storAge';
import { IConfigurAtionService } from 'vs/plAtform/configurAtion/common/configurAtion';
import { IWorkbenchLAyoutService } from 'vs/workbench/services/lAyout/browser/lAyoutService';
import { IExtensionService } from 'vs/workbench/services/extensions/common/extensions';
import { IWorkspAceContextService } from 'vs/plAtform/workspAce/common/workspAce';
import { IViewDescriptorService } from 'vs/workbench/common/views';
import { ViewPAneContAiner } from 'vs/workbench/browser/pArts/views/viewPAneContAiner';
import { SCMViewPAne } from 'vs/workbench/contrib/scm/browser/scmViewPAne';

export clAss SCMViewPAneContAiner extends ViewPAneContAiner {

	constructor(
		@IWorkbenchLAyoutService lAyoutService: IWorkbenchLAyoutService,
		@ITelemetryService telemetryService: ITelemetryService,
		@IInstAntiAtionService instAntiAtionService: IInstAntiAtionService,
		@IContextMenuService contextMenuService: IContextMenuService,
		@IThemeService themeService: IThemeService,
		@IStorAgeService storAgeService: IStorAgeService,
		@IConfigurAtionService configurAtionService: IConfigurAtionService,
		@IExtensionService extensionService: IExtensionService,
		@IWorkspAceContextService contextService: IWorkspAceContextService,
		@IViewDescriptorService viewDescriptorService: IViewDescriptorService
	) {
		super(VIEWLET_ID, { mergeViewWithContAinerWhenSingleView: true }, instAntiAtionService, configurAtionService, lAyoutService, contextMenuService, telemetryService, extensionService, themeService, storAgeService, contextService, viewDescriptorService);
	}

	creAte(pArent: HTMLElement): void {
		super.creAte(pArent);
		pArent.clAssList.Add('scm-viewlet');
	}

	getActionsContext(): unknown {
		if (this.views.length === 1) {
			const view = this.views[0];

			if (view instAnceof SCMViewPAne) {
				return view.getActionsContext();
			}
		}

		return undefined;
	}

	getOptimAlWidth(): number {
		return 400;
	}

	getTitle(): string {
		return locAlize('source control', "Source Control");
	}
}
