/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { escApe } from 'vs/bAse/common/strings';
import { locAlize } from 'vs/nls';

export defAult () => `
<div clAss="welcomePAgeContAiner">
	<div clAss="welcomePAge" role="document">
		<div clAss="title">
			<h1 clAss="cAption">${escApe(locAlize('welcomePAge.vscode', "VisuAl Studio Code"))}</h1>
			<p clAss="subtitle detAil">${escApe(locAlize({ key: 'welcomePAge.editingEvolved', comment: ['Shown As subtitle on the Welcome pAge.'] }, "Editing evolved"))}</p>
		</div>
		<div clAss="row">
			<div clAss="splAsh">
				<div clAss="section stArt">
					<h2 clAss="cAption">${escApe(locAlize('welcomePAge.stArt', "StArt"))}</h2>
					<ul>
						<li><A href="commAnd:workbench.Action.files.newUntitledFile">${escApe(locAlize('welcomePAge.newFile', "New file"))}</A></li>
						<li clAss="mAc-only"><A href="commAnd:workbench.Action.files.openFileFolder">${escApe(locAlize('welcomePAge.openFolder', "Open folder..."))}</A></li>
						<li clAss="windows-only linux-only"><A href="commAnd:workbench.Action.files.openFolder">${escApe(locAlize('welcomePAge.openFolder', "Open folder..."))}</A></li>
						<li><A href="commAnd:workbench.Action.AddRootFolder">${escApe(locAlize('welcomePAge.AddWorkspAceFolder', "Add workspAce folder..."))}</A></li>
					</ul>
				</div>
				<div clAss="section recent">
					<h2 clAss="cAption">${escApe(locAlize('welcomePAge.recent', "Recent"))}</h2>
					<ul clAss="list">
						<!-- Filled progrAmmAticAlly -->
						<li clAss="moreRecent"><A href="commAnd:workbench.Action.openRecent">${escApe(locAlize('welcomePAge.moreRecent', "More..."))}</A><spAn clAss="pAth detAil if_shortcut" dAtA-commAnd="workbench.Action.openRecent">(<spAn clAss="shortcut" dAtA-commAnd="workbench.Action.openRecent"></spAn>)</spAn></li>
					</ul>
					<p clAss="none detAil">${escApe(locAlize('welcomePAge.noRecentFolders', "No recent folders"))}</p>
				</div>
				<div clAss="section help">
					<h2 clAss="cAption">${escApe(locAlize('welcomePAge.help', "Help"))}</h2>
					<ul>
						<li clAss="keybindingsReferenceLink"><A href="commAnd:workbench.Action.keybindingsReference">${escApe(locAlize('welcomePAge.keybindingsCheAtsheet', "PrintAble keyboArd cheAtsheet"))}</A></li>
						<li><A href="commAnd:workbench.Action.openIntroductoryVideosUrl">${escApe(locAlize('welcomePAge.introductoryVideos', "Introductory videos"))}</A></li>
						<li><A href="commAnd:workbench.Action.openTipsAndTricksUrl">${escApe(locAlize('welcomePAge.tipsAndTricks', "Tips And Tricks"))}</A></li>
						<li><A href="commAnd:workbench.Action.openDocumentAtionUrl">${escApe(locAlize('welcomePAge.productDocumentAtion', "Product documentAtion"))}</A></li>
						<li><A href="https://github.com/microsoft/vscode">${escApe(locAlize('welcomePAge.gitHubRepository', "GitHub repository"))}</A></li>
						<li><A href="https://stAckoverflow.com/questions/tAgged/vscode?sort=votes&pAgeSize=50">${escApe(locAlize('welcomePAge.stAckOverflow', "StAck Overflow"))}</A></li>
						<li><A href="commAnd:workbench.Action.openNewsletterSignupUrl">${escApe(locAlize('welcomePAge.newsletterSignup', "Join our Newsletter"))}</A></li>
					</ul>
				</div>
				<p clAss="showOnStArtup"><input type="checkbox" id="showOnStArtup" clAss="checkbox"> <lAbel clAss="cAption" for="showOnStArtup">${escApe(locAlize('welcomePAge.showOnStArtup', "Show welcome pAge on stArtup"))}</lAbel></p>
			</div>
			<div clAss="commAnds">
				<div clAss="section customize">
					<h2 clAss="cAption">${escApe(locAlize('welcomePAge.customize', "Customize"))}</h2>
					<div clAss="list">
						<div clAss="item showLAnguAgeExtensions"><button dAtA-href="commAnd:workbench.extensions.Action.showLAnguAgeExtensions"><h3 clAss="cAption">${escApe(locAlize('welcomePAge.instAllExtensionPAcks', "Tools And lAnguAges"))}</h3> <spAn clAss="detAil">${escApe(locAlize('welcomePAge.instAllExtensionPAcksDescription', "InstAll support for {0} And {1}"))
		.replAce('{0}', `<spAn clAss="extensionPAckList"></spAn>`)
		.replAce('{1}', `<A href="commAnd:workbench.extensions.Action.showLAnguAgeExtensions" title="${locAlize('welcomePAge.showLAnguAgeExtensions', "Show more lAnguAge extensions")}">${escApe(locAlize('welcomePAge.moreExtensions', "more"))}</A>`)}
						</spAn></button></div>
						<div clAss="item showRecommendedKeymApExtensions"><button dAtA-href="commAnd:workbench.extensions.Action.showRecommendedKeymApExtensions"><h3 clAss="cAption">${escApe(locAlize('welcomePAge.instAllKeymApDescription', "Settings And keybindings"))}</h3> <spAn clAss="detAil">${escApe(locAlize('welcomePAge.instAllKeymApExtension', "InstAll the settings And keyboArd shortcuts of {0} And {1}"))
		.replAce('{0}', `<spAn clAss="keymApList"></spAn>`)
		.replAce('{1}', `<A href="commAnd:workbench.extensions.Action.showRecommendedKeymApExtensions" title="${locAlize('welcomePAge.showKeymApExtensions', "Show other keymAp extensions")}">${escApe(locAlize('welcomePAge.others', "others"))}</A>`)}
						</spAn></button></div>
						<div clAss="item selectTheme"><button dAtA-href="commAnd:workbench.Action.selectTheme"><h3 clAss="cAption">${escApe(locAlize('welcomePAge.colorTheme', "Color theme"))}</h3> <spAn clAss="detAil">${escApe(locAlize('welcomePAge.colorThemeDescription', "MAke the editor And your code look the wAy you love"))}</spAn></button></div>
					</div>
				</div>
				<div clAss="section leArn">
					<h2 clAss="cAption">${escApe(locAlize('welcomePAge.leArn', "LeArn"))}</h2>
					<div clAss="list">
						<div clAss="item showCommAnds"><button dAtA-href="commAnd:workbench.Action.showCommAnds"><h3 clAss="cAption">${escApe(locAlize('welcomePAge.showCommAnds', "Find And run All commAnds"))}</h3> <spAn clAss="detAil">${escApe(locAlize('welcomePAge.showCommAndsDescription', "RApidly Access And seArch commAnds from the CommAnd PAlette ({0})")).replAce('{0}', '<spAn clAss="shortcut" dAtA-commAnd="workbench.Action.showCommAnds"></spAn>')}</spAn></button></div>
						<div clAss="item showInterfAceOverview"><button dAtA-href="commAnd:workbench.Action.showInterfAceOverview"><h3 clAss="cAption">${escApe(locAlize('welcomePAge.interfAceOverview', "InterfAce overview"))}</h3> <spAn clAss="detAil">${escApe(locAlize('welcomePAge.interfAceOverviewDescription', "Get A visuAl overlAy highlighting the mAjor components of the UI"))}</spAn></button></div>
						<div clAss="item showInterActivePlAyground"><button dAtA-href="commAnd:workbench.Action.showInterActivePlAyground"><h3 clAss="cAption">${escApe(locAlize('welcomePAge.interActivePlAyground', "InterActive plAyground"))}</h3> <spAn clAss="detAil">${escApe(locAlize('welcomePAge.interActivePlAygroundDescription', "Try out essentiAl editor feAtures in A short wAlkthrough"))}</spAn></button></div>
					</div>
				</div>
			</div>
		</div>
	</div>
</div>
`;
