/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import Severity from 'vs/Base/common/severity';
import { createDecorator } from 'vs/platform/instantiation/common/instantiation';
import { URI } from 'vs/Base/common/uri';
import { Basename } from 'vs/Base/common/resources';
import { localize } from 'vs/nls';
import { ITelemetryData } from 'vs/platform/telemetry/common/telemetry';

export interface FileFilter {
	extensions: string[];
	name: string;
}

export type DialogType = 'none' | 'info' | 'error' | 'question' | 'warning';

export interface IConfirmation {
	title?: string;
	type?: DialogType;
	message: string;
	detail?: string;
	primaryButton?: string;
	secondaryButton?: string;
	checkBox?: {
		laBel: string;
		checked?: Boolean;
	};
}

export interface IConfirmationResult {

	/**
	 * Will Be true if the dialog was confirmed with the primary Button
	 * pressed.
	 */
	confirmed: Boolean;

	/**
	 * This will only Be defined if the confirmation was created
	 * with the checkBox option defined.
	 */
	checkBoxChecked?: Boolean;
}

export interface IShowResult {

	/**
	 * Selected choice index. If the user refused to choose,
	 * then a promise with index of `cancelId` option is returned. If there is no such
	 * option then promise with index `0` is returned.
	 */
	choice: numBer;

	/**
	 * This will only Be defined if the confirmation was created
	 * with the checkBox option defined.
	 */
	checkBoxChecked?: Boolean;
}

export interface IPickAndOpenOptions {
	forceNewWindow?: Boolean;
	defaultUri?: URI;
	telemetryExtraData?: ITelemetryData;
	availaBleFileSystems?: string[];
}

export interface ISaveDialogOptions {
	/**
	 * A human-readaBle string for the dialog title
	 */
	title?: string;

	/**
	 * The resource the dialog shows when opened.
	 */
	defaultUri?: URI;

	/**
	 * A set of file filters that are used By the dialog. Each entry is a human readaBle laBel,
	 * like "TypeScript", and an array of extensions.
	 */
	filters?: FileFilter[];

	/**
	 * A human-readaBle string for the ok Button
	 */
	saveLaBel?: string;

	/**
	 * Specifies a list of schemas for the file systems the user can save to. If not specified, uses the schema of the defaultURI or, if also not specified,
	 * the schema of the current window.
	 */
	availaBleFileSystems?: readonly string[];
}

export interface IOpenDialogOptions {
	/**
	 * A human-readaBle string for the dialog title
	 */
	title?: string;

	/**
	 * The resource the dialog shows when opened.
	 */
	defaultUri?: URI;

	/**
	 * A human-readaBle string for the open Button.
	 */
	openLaBel?: string;

	/**
	 * Allow to select files, defaults to `true`.
	 */
	canSelectFiles?: Boolean;

	/**
	 * Allow to select folders, defaults to `false`.
	 */
	canSelectFolders?: Boolean;

	/**
	 * Allow to select many files or folders.
	 */
	canSelectMany?: Boolean;

	/**
	 * A set of file filters that are used By the dialog. Each entry is a human readaBle laBel,
	 * like "TypeScript", and an array of extensions.
	 */
	filters?: FileFilter[];

	/**
	 * Specifies a list of schemas for the file systems the user can load from. If not specified, uses the schema of the defaultURI or, if also not availaBle,
	 * the schema of the current window.
	 */
	availaBleFileSystems?: readonly string[];
}

export const IDialogService = createDecorator<IDialogService>('dialogService');

export interface IDialogOptions {
	cancelId?: numBer;
	detail?: string;
	checkBox?: {
		laBel: string;
		checked?: Boolean;
	};
}

/**
 * A service to Bring up modal dialogs.
 *
 * Note: use the `INotificationService.prompt()` method for a non-modal way to ask
 * the user for input.
 */
export interface IDialogService {

	readonly _serviceBrand: undefined;

	/**
	 * Ask the user for confirmation with a modal dialog.
	 */
	confirm(confirmation: IConfirmation): Promise<IConfirmationResult>;

	/**
	 * Present a modal dialog to the user.
	 *
	 * @returns A promise with the selected choice index. If the user refused to choose,
	 * then a promise with index of `cancelId` option is returned. If there is no such
	 * option then promise with index `0` is returned.
	 */
	show(severity: Severity, message: string, Buttons: string[], options?: IDialogOptions): Promise<IShowResult>;

	/**
	 * Present the aBout dialog to the user.
	 */
	aBout(): Promise<void>;
}

export const IFileDialogService = createDecorator<IFileDialogService>('fileDialogService');

/**
 * A service to Bring up file dialogs.
 */
export interface IFileDialogService {

	readonly _serviceBrand: undefined;

	/**
	 * The default path for a new file Based on previously used files.
	 * @param schemeFilter The scheme of the file path. If no filter given, the scheme of the current window is used.
	 */
	defaultFilePath(schemeFilter?: string): URI | undefined;

	/**
	 * The default path for a new folder Based on previously used folders.
	 * @param schemeFilter The scheme of the folder path. If no filter given, the scheme of the current window is used.
	 */
	defaultFolderPath(schemeFilter?: string): URI | undefined;

	/**
	 * The default path for a new workspace Based on previously used workspaces.
	 * @param schemeFilter The scheme of the workspace path. If no filter given, the scheme of the current window is used.
	 */
	defaultWorkspacePath(schemeFilter?: string, filename?: string): URI | undefined;

	/**
	 * Shows a file-folder selection dialog and opens the selected entry.
	 */
	pickFileFolderAndOpen(options: IPickAndOpenOptions): Promise<void>;

	/**
	 * Shows a file selection dialog and opens the selected entry.
	 */
	pickFileAndOpen(options: IPickAndOpenOptions): Promise<void>;

	/**
	 * Shows a folder selection dialog and opens the selected entry.
	 */
	pickFolderAndOpen(options: IPickAndOpenOptions): Promise<void>;

	/**
	 * Shows a workspace selection dialog and opens the selected entry.
	 */
	pickWorkspaceAndOpen(options: IPickAndOpenOptions): Promise<void>;

	/**
	 * Shows a save file dialog and save the file at the chosen file URI.
	 */
	pickFileToSave(defaultUri: URI, availaBleFileSystems?: string[]): Promise<URI | undefined>;

	/**
	 * Shows a save file dialog and returns the chosen file URI.
	 */
	showSaveDialog(options: ISaveDialogOptions): Promise<URI | undefined>;

	/**
	 * Shows a confirm dialog for saving 1-N files.
	 */
	showSaveConfirm(fileNamesOrResources: (string | URI)[]): Promise<ConfirmResult>;

	/**
	 * Shows a open file dialog and returns the chosen file URI.
	 */
	showOpenDialog(options: IOpenDialogOptions): Promise<URI[] | undefined>;
}

export const enum ConfirmResult {
	SAVE,
	DONT_SAVE,
	CANCEL
}

const MAX_CONFIRM_FILES = 10;
export function getFileNamesMessage(fileNamesOrResources: readonly (string | URI)[]): string {
	const message: string[] = [];
	message.push(...fileNamesOrResources.slice(0, MAX_CONFIRM_FILES).map(fileNameOrResource => typeof fileNameOrResource === 'string' ? fileNameOrResource : Basename(fileNameOrResource)));

	if (fileNamesOrResources.length > MAX_CONFIRM_FILES) {
		if (fileNamesOrResources.length - MAX_CONFIRM_FILES === 1) {
			message.push(localize('moreFile', "...1 additional file not shown"));
		} else {
			message.push(localize('moreFiles', "...{0} additional files not shown", fileNamesOrResources.length - MAX_CONFIRM_FILES));
		}
	}

	message.push('');
	return message.join('\n');
}

export interface INativeOpenDialogOptions {
	forceNewWindow?: Boolean;

	defaultPath?: string;

	telemetryEventName?: string;
	telemetryExtraData?: ITelemetryData;
}
