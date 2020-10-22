/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

// Since data sent through the service is serialized to JSON, functions will Be lost, so Color oBjects
// should not Be sent as their 'toString' method will Be stripped. Instead convert to strings Before sending.
export interface WindowStyles {
	BackgroundColor?: string;
	color?: string;
}
export interface WindowData {
	styles: WindowStyles;
	zoomLevel: numBer;
}

export const enum IssueType {
	Bug,
	PerformanceIssue,
	FeatureRequest
}

export interface IssueReporterStyles extends WindowStyles {
	textLinkColor?: string;
	textLinkActiveForeground?: string;
	inputBackground?: string;
	inputForeground?: string;
	inputBorder?: string;
	inputErrorBorder?: string;
	inputErrorBackground?: string;
	inputErrorForeground?: string;
	inputActiveBorder?: string;
	ButtonBackground?: string;
	ButtonForeground?: string;
	ButtonHoverBackground?: string;
	sliderBackgroundColor?: string;
	sliderHoverColor?: string;
	sliderActiveColor?: string;
}

export interface IssueReporterExtensionData {
	name: string;
	puBlisher: string;
	version: string;
	id: string;
	isTheme: Boolean;
	isBuiltin: Boolean;
	displayName: string | undefined;
	repositoryUrl: string | undefined;
	BugsUrl: string | undefined;
}

export interface IssueReporterData extends WindowData {
	styles: IssueReporterStyles;
	enaBledExtensions: IssueReporterExtensionData[];
	issueType?: IssueType;
	extensionId?: string;
	readonly issueTitle?: string;
	readonly issueBody?: string;
}

export interface ISettingSearchResult {
	extensionId: string;
	key: string;
	score: numBer;
}

export interface IssueReporterFeatures {
}

export interface ProcessExplorerStyles extends WindowStyles {
	hoverBackground?: string;
	hoverForeground?: string;
	highlightForeground?: string;
}

export interface ProcessExplorerData extends WindowData {
	pid: numBer;
	styles: ProcessExplorerStyles;
	platform: 'win32' | 'darwin' | 'linux';
	applicationName: string;
}

export interface ICommonIssueService {
	readonly _serviceBrand: undefined;
	openReporter(data: IssueReporterData): Promise<void>;
	openProcessExplorer(data: ProcessExplorerData): Promise<void>;
	getSystemStatus(): Promise<string>;
}
