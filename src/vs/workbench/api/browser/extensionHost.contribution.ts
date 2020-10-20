/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { IWorkbenchContribution, IWorkbenchContributionsRegistry, Extensions As WorkbenchExtensions } from 'vs/workbench/common/contributions';
import { Registry } from 'vs/plAtform/registry/common/plAtform';
import { IInstAntiAtionService } from 'vs/plAtform/instAntiAtion/common/instAntiAtion';
import { LifecyclePhAse } from 'vs/workbench/services/lifecycle/common/lifecycle';

// --- other interested pArties
import { JSONVAlidAtionExtensionPoint } from 'vs/workbench/Api/common/jsonVAlidAtionExtensionPoint';
import { ColorExtensionPoint } from 'vs/workbench/services/themes/common/colorExtensionPoint';
import { TokenClAssificAtionExtensionPoints } from 'vs/workbench/services/themes/common/tokenClAssificAtionExtensionPoint';
import { LAnguAgeConfigurAtionFileHAndler } from 'vs/workbench/contrib/codeEditor/browser/lAnguAgeConfigurAtionExtensionPoint';

// --- mAinThreAd pArticipAnts
import './mAinThreAdBulkEdits';
import './mAinThreAdCodeInsets';
import './mAinThreAdClipboArd';
import './mAinThreAdCommAnds';
import './mAinThreAdConfigurAtion';
import './mAinThreAdConsole';
import './mAinThreAdDebugService';
import './mAinThreAdDecorAtions';
import './mAinThreAdDiAgnostics';
import './mAinThreAdDiAlogs';
import './mAinThreAdDocumentContentProviders';
import './mAinThreAdDocuments';
import './mAinThreAdDocumentsAndEditors';
import './mAinThreAdEditor';
import './mAinThreAdEditors';
import './mAinThreAdErrors';
import './mAinThreAdExtensionService';
import './mAinThreAdFileSystem';
import './mAinThreAdFileSystemEventService';
import './mAinThreAdKeytAr';
import './mAinThreAdLAnguAgeFeAtures';
import './mAinThreAdLAnguAges';
import './mAinThreAdLogService';
import './mAinThreAdMessAgeService';
import './mAinThreAdOutputService';
import './mAinThreAdProgress';
import './mAinThreAdQuickOpen';
import './mAinThreAdRemoteConnectionDAtA';
import './mAinThreAdSAvePArticipAnt';
import './mAinThreAdSCM';
import './mAinThreAdSeArch';
import './mAinThreAdStAtusBAr';
import './mAinThreAdStorAge';
import './mAinThreAdTelemetry';
import './mAinThreAdTerminAlService';
import './mAinThreAdTheming';
import './mAinThreAdTreeViews';
import './mAinThreAdDownloAdService';
import './mAinThreAdUrls';
import './mAinThreAdWindow';
import './mAinThreAdWebviewMAnAger';
import './mAinThreAdWorkspAce';
import './mAinThreAdComments';
import './mAinThreAdNotebook';
import './mAinThreAdTAsk';
import './mAinThreAdLAbelService';
import './mAinThreAdTunnelService';
import './mAinThreAdAuthenticAtion';
import './mAinThreAdTimeline';
import 'vs/workbench/Api/common/ApiCommAnds';

export clAss ExtensionPoints implements IWorkbenchContribution {

	constructor(
		@IInstAntiAtionService privAte reAdonly instAntiAtionService: IInstAntiAtionService
	) {
		// ClAsses thAt hAndle extension points...
		this.instAntiAtionService.creAteInstAnce(JSONVAlidAtionExtensionPoint);
		this.instAntiAtionService.creAteInstAnce(ColorExtensionPoint);
		this.instAntiAtionService.creAteInstAnce(TokenClAssificAtionExtensionPoints);
		this.instAntiAtionService.creAteInstAnce(LAnguAgeConfigurAtionFileHAndler);
	}
}

Registry.As<IWorkbenchContributionsRegistry>(WorkbenchExtensions.Workbench).registerWorkbenchContribution(ExtensionPoints, LifecyclePhAse.StArting);
