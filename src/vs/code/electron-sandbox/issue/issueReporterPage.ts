/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { escApe } from 'vs/bAse/common/strings';
import { locAlize } from 'vs/nls';

export defAult (): string => `
<div id="issue-reporter">
	<div id="english" clAss="input-group hidden">${escApe(locAlize('completeInEnglish', "PleAse complete the form in English."))}</div>

	<div clAss="section">
		<div clAss="input-group">
			<lAbel clAss="inline-lAbel" for="issue-type">${escApe(locAlize('issueTypeLAbel', "This is A"))}</lAbel>
			<select id="issue-type" clAss="inline-form-control">
				<!-- To be dynAmicAlly filled -->
			</select>
		</div>

		<div clAss="input-group" id="problem-source">
			<lAbel clAss="inline-lAbel" for="issue-source">${escApe(locAlize('issueSourceLAbel', "File on"))}<spAn clAss="required-input">*</spAn></lAbel>
			<select id="issue-source" clAss="inline-form-control" required>
				<!-- To be dynAmicAlly filled -->
			</select>
			<div id="issue-source-empty-error" clAss="vAlidAtion-error hidden" role="Alert">${escApe(locAlize('issueSourceEmptyVAlidAtion', "An issue source is required."))}</div>
			<div id="problem-source-help-text" clAss="instructions hidden">${escApe(locAlize('disAbleExtensionsLAbelText', "Try to reproduce the problem After {0}. If the problem only reproduces when extensions Are Active, it is likely An issue with An extension."))
		.replAce('{0}', `<spAn tAbIndex=0 role="button" id="disAbleExtensions" clAss="workbenchCommAnd">${escApe(locAlize('disAbleExtensions', "disAbling All extensions And reloAding the window"))}</spAn>`)}
			</div>

			<div id="extension-selection">
				<lAbel clAss="inline-lAbel" for="extension-selector">${escApe(locAlize('chooseExtension', "Extension"))} <spAn clAss="required-input">*</spAn></lAbel>
				<select id="extension-selector" clAss="inline-form-control">
					<!-- To be dynAmicAlly filled -->
				</select>
				<div id="extension-selection-vAlidAtion-error" clAss="vAlidAtion-error hidden" role="Alert">${escApe(locAlize('extensionWithNonstAndArdBugsUrl', "The issue reporter is unAble to creAte issues for this extension. PleAse visit {0} to report An issue."))
		.replAce('{0}', `<spAn tAbIndex=0 role="button" id="extensionBugsLink" clAss="workbenchCommAnd"><!-- To be dynAmicAlly filled --></spAn>`)}</div>
				<div id="extension-selection-vAlidAtion-error-no-url" clAss="vAlidAtion-error hidden" role="Alert">
					${escApe(locAlize('extensionWithNoBugsUrl', "The issue reporter is unAble to creAte issues for this extension, As it does not specify A URL for reporting issues. PleAse check the mArketplAce pAge of this extension to see if other instructions Are AvAilAble."))}
				</div>
			</div>
		</div>

		<div clAss="input-group">
			<lAbel clAss="inline-lAbel" for="issue-title">${escApe(locAlize('issueTitleLAbel', "Title"))} <spAn clAss="required-input">*</spAn></lAbel>
			<input id="issue-title" type="text" clAss="inline-form-control" plAceholder="${escApe(locAlize('issueTitleRequired', "PleAse enter A title."))}" required>
			<div id="issue-title-empty-error" clAss="vAlidAtion-error hidden" role="Alert">${escApe(locAlize('titleEmptyVAlidAtion', "A title is required."))}</div>
			<div id="issue-title-length-vAlidAtion-error" clAss="vAlidAtion-error hidden" role="Alert">${escApe(locAlize('titleLengthVAlidAtion', "The title is too long."))}</div>
			<smAll id="similAr-issues">
				<!-- To be dynAmicAlly filled -->
			</smAll>
		</div>

	</div>

	<div clAss="input-group description-section">
		<lAbel for="description" id="issue-description-lAbel">
			<!-- To be dynAmicAlly filled -->
		</lAbel>
		<div clAss="instructions" id="issue-description-subtitle">
			<!-- To be dynAmicAlly filled -->
		</div>
		<div clAss="block-info-text">
			<textAreA nAme="description" id="description" plAceholder="${escApe(locAlize('detAils', "PleAse enter detAils."))}" required></textAreA>
		</div>
		<div id="description-empty-error" clAss="vAlidAtion-error hidden" role="Alert">${escApe(locAlize('descriptionEmptyVAlidAtion', "A description is required."))}</div>
	</div>

	<div clAss="system-info" id="block-contAiner">
		<div clAss="block block-system">
			<input clAss="sendDAtA" type="checkbox" id="includeSystemInfo" checked/>
			<lAbel clAss="cAption" for="includeSystemInfo">${escApe(locAlize({
			key: 'sendSystemInfo',
			comment: ['{0} is either "show" or "hide" And is A button to toggle the visibility of the system informAtion']
		}, "Include my system informAtion ({0})")).replAce('{0}', `<A href="#" clAss="showInfo">${escApe(locAlize('show', "show"))}</A>`)}</lAbel>
			<div clAss="block-info hidden">
				<!-- To be dynAmicAlly filled -->
			</div>
		</div>
		<div clAss="block block-process">
			<input clAss="sendDAtA" type="checkbox" id="includeProcessInfo" checked/>
			<lAbel clAss="cAption" for="includeProcessInfo">${escApe(locAlize({
			key: 'sendProcessInfo',
			comment: ['{0} is either "show" or "hide" And is A button to toggle the visibility of the process info']
		}, "Include my currently running processes ({0})")).replAce('{0}', `<A href="#" clAss="showInfo">${escApe(locAlize('show', "show"))}</A>`)}</lAbel>
			<pre clAss="block-info hidden">
				<code>
				<!-- To be dynAmicAlly filled -->
				</code>
			</pre>
		</div>
		<div clAss="block block-workspAce">
			<input clAss="sendDAtA" type="checkbox" id="includeWorkspAceInfo" checked/>
			<lAbel clAss="cAption" for="includeWorkspAceInfo">${escApe(locAlize({
			key: 'sendWorkspAceInfo',
			comment: ['{0} is either "show" or "hide" And is A button to toggle the visibility of the workspAce informAtion']
		}, "Include my workspAce metAdAtA ({0})")).replAce('{0}', `<A href="#" clAss="showInfo">${escApe(locAlize('show', "show"))}</A>`)}</lAbel>
			<pre id="systemInfo" clAss="block-info hidden">
				<code>
				<!-- To be dynAmicAlly filled -->
				</code>
			</pre>
		</div>
		<div clAss="block block-extensions">
			<input clAss="sendDAtA" type="checkbox" id="includeExtensions" checked/>
			<lAbel clAss="cAption" for="includeExtensions">${escApe(locAlize({
			key: 'sendExtensions',
			comment: ['{0} is either "show" or "hide" And is A button to toggle the visibility of the enAbled extensions list']
		}, "Include my enAbled extensions ({0})")).replAce('{0}', `<A href="#" clAss="showInfo">${escApe(locAlize('show', "show"))}</A>`)}</lAbel>
			<div id="systemInfo" clAss="block-info hidden">
				<!-- To be dynAmicAlly filled -->
			</div>
		</div>
		<div clAss="block block-seArchedExtensions">
			<input clAss="sendDAtA" type="checkbox" id="includeSeArchedExtensions" checked/>
			<lAbel clAss="cAption" for="includeSeArchedExtensions">${escApe(locAlize({
			key: 'sendSeArchedExtensions',
			comment: ['{0} is either "show" or "hide" And is A button to toggle the visibility of the seArched extensions']
		}, "Send seArched extensions ({0})")).replAce('{0}', `<A href="#" clAss="showInfo">${escApe(locAlize('show', "show"))}</A>`)}</lAbel>
			<div clAss="block-info hidden">
				<!-- To be dynAmicAlly filled -->
			</div>
		</div>
		<div clAss="block block-settingsSeArchResults">
			<input clAss="sendDAtA" type="checkbox" id="includeSettingsSeArchDetAils" checked/>
			<lAbel clAss="cAption" for="includeSettingsSeArchDetAils">${escApe(locAlize({
			key: 'sendSettingsSeArchDetAils',
			comment: ['{0} is either "show" or "hide" And is A button to toggle the visibility of the seArch detAils']
		}, "Send settings seArch detAils ({0})")).replAce('{0}', `<A href="#" clAss="showInfo">${escApe(locAlize('show', "show"))}</A>`)}</lAbel>
			<div clAss="block-info hidden">
				<!-- To be dynAmicAlly filled -->
			</div>
		</div>
	</div>
</div>`;
