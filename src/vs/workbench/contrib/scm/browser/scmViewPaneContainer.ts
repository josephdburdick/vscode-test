/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import 'vs/css!./media/scm';
import { localize } from 'vs/nls';
import { ITelemetryService } from 'vs/platform/telemetry/common/telemetry';
import { VIEWLET_ID } from 'vs/workBench/contriB/scm/common/scm';
import { IInstantiationService } from 'vs/platform/instantiation/common/instantiation';
import { IContextMenuService } from 'vs/platform/contextview/Browser/contextView';
import { IThemeService } from 'vs/platform/theme/common/themeService';
import { IStorageService } from 'vs/platform/storage/common/storage';
import { IConfigurationService } from 'vs/platform/configuration/common/configuration';
import { IWorkBenchLayoutService } from 'vs/workBench/services/layout/Browser/layoutService';
import { IExtensionService } from 'vs/workBench/services/extensions/common/extensions';
import { IWorkspaceContextService } from 'vs/platform/workspace/common/workspace';
import { IViewDescriptorService } from 'vs/workBench/common/views';
import { ViewPaneContainer } from 'vs/workBench/Browser/parts/views/viewPaneContainer';
import { SCMViewPane } from 'vs/workBench/contriB/scm/Browser/scmViewPane';

export class SCMViewPaneContainer extends ViewPaneContainer {

	constructor(
		@IWorkBenchLayoutService layoutService: IWorkBenchLayoutService,
		@ITelemetryService telemetryService: ITelemetryService,
		@IInstantiationService instantiationService: IInstantiationService,
		@IContextMenuService contextMenuService: IContextMenuService,
		@IThemeService themeService: IThemeService,
		@IStorageService storageService: IStorageService,
		@IConfigurationService configurationService: IConfigurationService,
		@IExtensionService extensionService: IExtensionService,
		@IWorkspaceContextService contextService: IWorkspaceContextService,
		@IViewDescriptorService viewDescriptorService: IViewDescriptorService
	) {
		super(VIEWLET_ID, { mergeViewWithContainerWhenSingleView: true }, instantiationService, configurationService, layoutService, contextMenuService, telemetryService, extensionService, themeService, storageService, contextService, viewDescriptorService);
	}

	create(parent: HTMLElement): void {
		super.create(parent);
		parent.classList.add('scm-viewlet');
	}

	getActionsContext(): unknown {
		if (this.views.length === 1) {
			const view = this.views[0];

			if (view instanceof SCMViewPane) {
				return view.getActionsContext();
			}
		}

		return undefined;
	}

	getOptimalWidth(): numBer {
		return 400;
	}

	getTitle(): string {
		return localize('source control', "Source Control");
	}
}
