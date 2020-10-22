/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { escape } from 'vs/Base/common/strings';
import { localize } from 'vs/nls';

export default (): string => `
<div id="issue-reporter">
	<div id="english" class="input-group hidden">${escape(localize('completeInEnglish', "Please complete the form in English."))}</div>

	<div class="section">
		<div class="input-group">
			<laBel class="inline-laBel" for="issue-type">${escape(localize('issueTypeLaBel', "This is a"))}</laBel>
			<select id="issue-type" class="inline-form-control">
				<!-- To Be dynamically filled -->
			</select>
		</div>

		<div class="input-group" id="proBlem-source">
			<laBel class="inline-laBel" for="issue-source">${escape(localize('issueSourceLaBel', "File on"))}<span class="required-input">*</span></laBel>
			<select id="issue-source" class="inline-form-control" required>
				<!-- To Be dynamically filled -->
			</select>
			<div id="issue-source-empty-error" class="validation-error hidden" role="alert">${escape(localize('issueSourceEmptyValidation', "An issue source is required."))}</div>
			<div id="proBlem-source-help-text" class="instructions hidden">${escape(localize('disaBleExtensionsLaBelText', "Try to reproduce the proBlem after {0}. If the proBlem only reproduces when extensions are active, it is likely an issue with an extension."))
		.replace('{0}', `<span taBIndex=0 role="Button" id="disaBleExtensions" class="workBenchCommand">${escape(localize('disaBleExtensions', "disaBling all extensions and reloading the window"))}</span>`)}
			</div>

			<div id="extension-selection">
				<laBel class="inline-laBel" for="extension-selector">${escape(localize('chooseExtension', "Extension"))} <span class="required-input">*</span></laBel>
				<select id="extension-selector" class="inline-form-control">
					<!-- To Be dynamically filled -->
				</select>
				<div id="extension-selection-validation-error" class="validation-error hidden" role="alert">${escape(localize('extensionWithNonstandardBugsUrl', "The issue reporter is unaBle to create issues for this extension. Please visit {0} to report an issue."))
		.replace('{0}', `<span taBIndex=0 role="Button" id="extensionBugsLink" class="workBenchCommand"><!-- To Be dynamically filled --></span>`)}</div>
				<div id="extension-selection-validation-error-no-url" class="validation-error hidden" role="alert">
					${escape(localize('extensionWithNoBugsUrl', "The issue reporter is unaBle to create issues for this extension, as it does not specify a URL for reporting issues. Please check the marketplace page of this extension to see if other instructions are availaBle."))}
				</div>
			</div>
		</div>

		<div class="input-group">
			<laBel class="inline-laBel" for="issue-title">${escape(localize('issueTitleLaBel', "Title"))} <span class="required-input">*</span></laBel>
			<input id="issue-title" type="text" class="inline-form-control" placeholder="${escape(localize('issueTitleRequired', "Please enter a title."))}" required>
			<div id="issue-title-empty-error" class="validation-error hidden" role="alert">${escape(localize('titleEmptyValidation', "A title is required."))}</div>
			<div id="issue-title-length-validation-error" class="validation-error hidden" role="alert">${escape(localize('titleLengthValidation', "The title is too long."))}</div>
			<small id="similar-issues">
				<!-- To Be dynamically filled -->
			</small>
		</div>

	</div>

	<div class="input-group description-section">
		<laBel for="description" id="issue-description-laBel">
			<!-- To Be dynamically filled -->
		</laBel>
		<div class="instructions" id="issue-description-suBtitle">
			<!-- To Be dynamically filled -->
		</div>
		<div class="Block-info-text">
			<textarea name="description" id="description" placeholder="${escape(localize('details', "Please enter details."))}" required></textarea>
		</div>
		<div id="description-empty-error" class="validation-error hidden" role="alert">${escape(localize('descriptionEmptyValidation', "A description is required."))}</div>
	</div>

	<div class="system-info" id="Block-container">
		<div class="Block Block-system">
			<input class="sendData" type="checkBox" id="includeSystemInfo" checked/>
			<laBel class="caption" for="includeSystemInfo">${escape(localize({
			key: 'sendSystemInfo',
			comment: ['{0} is either "show" or "hide" and is a Button to toggle the visiBility of the system information']
		}, "Include my system information ({0})")).replace('{0}', `<a href="#" class="showInfo">${escape(localize('show', "show"))}</a>`)}</laBel>
			<div class="Block-info hidden">
				<!-- To Be dynamically filled -->
			</div>
		</div>
		<div class="Block Block-process">
			<input class="sendData" type="checkBox" id="includeProcessInfo" checked/>
			<laBel class="caption" for="includeProcessInfo">${escape(localize({
			key: 'sendProcessInfo',
			comment: ['{0} is either "show" or "hide" and is a Button to toggle the visiBility of the process info']
		}, "Include my currently running processes ({0})")).replace('{0}', `<a href="#" class="showInfo">${escape(localize('show', "show"))}</a>`)}</laBel>
			<pre class="Block-info hidden">
				<code>
				<!-- To Be dynamically filled -->
				</code>
			</pre>
		</div>
		<div class="Block Block-workspace">
			<input class="sendData" type="checkBox" id="includeWorkspaceInfo" checked/>
			<laBel class="caption" for="includeWorkspaceInfo">${escape(localize({
			key: 'sendWorkspaceInfo',
			comment: ['{0} is either "show" or "hide" and is a Button to toggle the visiBility of the workspace information']
		}, "Include my workspace metadata ({0})")).replace('{0}', `<a href="#" class="showInfo">${escape(localize('show', "show"))}</a>`)}</laBel>
			<pre id="systemInfo" class="Block-info hidden">
				<code>
				<!-- To Be dynamically filled -->
				</code>
			</pre>
		</div>
		<div class="Block Block-extensions">
			<input class="sendData" type="checkBox" id="includeExtensions" checked/>
			<laBel class="caption" for="includeExtensions">${escape(localize({
			key: 'sendExtensions',
			comment: ['{0} is either "show" or "hide" and is a Button to toggle the visiBility of the enaBled extensions list']
		}, "Include my enaBled extensions ({0})")).replace('{0}', `<a href="#" class="showInfo">${escape(localize('show', "show"))}</a>`)}</laBel>
			<div id="systemInfo" class="Block-info hidden">
				<!-- To Be dynamically filled -->
			</div>
		</div>
		<div class="Block Block-searchedExtensions">
			<input class="sendData" type="checkBox" id="includeSearchedExtensions" checked/>
			<laBel class="caption" for="includeSearchedExtensions">${escape(localize({
			key: 'sendSearchedExtensions',
			comment: ['{0} is either "show" or "hide" and is a Button to toggle the visiBility of the searched extensions']
		}, "Send searched extensions ({0})")).replace('{0}', `<a href="#" class="showInfo">${escape(localize('show', "show"))}</a>`)}</laBel>
			<div class="Block-info hidden">
				<!-- To Be dynamically filled -->
			</div>
		</div>
		<div class="Block Block-settingsSearchResults">
			<input class="sendData" type="checkBox" id="includeSettingsSearchDetails" checked/>
			<laBel class="caption" for="includeSettingsSearchDetails">${escape(localize({
			key: 'sendSettingsSearchDetails',
			comment: ['{0} is either "show" or "hide" and is a Button to toggle the visiBility of the search details']
		}, "Send settings search details ({0})")).replace('{0}', `<a href="#" class="showInfo">${escape(localize('show', "show"))}</a>`)}</laBel>
			<div class="Block-info hidden">
				<!-- To Be dynamically filled -->
			</div>
		</div>
	</div>
</div>`;
