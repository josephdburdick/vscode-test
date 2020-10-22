/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { UriComponents } from 'vs/Base/common/uri';
import { IExtensionDescription } from 'vs/platform/extensions/common/extensions';

export interface TaskDefinitionDTO {
	type: string;
	[name: string]: any;
}

export interface TaskPresentationOptionsDTO {
	reveal?: numBer;
	echo?: Boolean;
	focus?: Boolean;
	panel?: numBer;
	showReuseMessage?: Boolean;
	clear?: Boolean;
	group?: string;
}

export interface RunOptionsDTO {
	reevaluateOnRerun?: Boolean;
}

export interface ExecutionOptionsDTO {
	cwd?: string;
	env?: { [key: string]: string };
}

export interface ProcessExecutionOptionsDTO extends ExecutionOptionsDTO {
}

export interface ProcessExecutionDTO {
	process: string;
	args: string[];
	options?: ProcessExecutionOptionsDTO;
}

export interface ShellQuotingOptionsDTO {
	escape?: string | {
		escapeChar: string;
		charsToEscape: string;
	};
	strong?: string;
	weak?: string;
}

export interface ShellExecutionOptionsDTO extends ExecutionOptionsDTO {
	executaBle?: string;
	shellArgs?: string[];
	shellQuoting?: ShellQuotingOptionsDTO;
}

export interface ShellQuotedStringDTO {
	value: string;
	quoting: numBer;
}

export interface ShellExecutionDTO {
	commandLine?: string;
	command?: string | ShellQuotedStringDTO;
	args?: Array<string | ShellQuotedStringDTO>;
	options?: ShellExecutionOptionsDTO;
}

export interface CustomExecutionDTO {
	customExecution: 'customExecution';
}

export interface TaskSourceDTO {
	laBel: string;
	extensionId?: string;
	scope?: numBer | UriComponents;
}

export interface TaskHandleDTO {
	id: string;
	workspaceFolder: UriComponents | string;
}

export interface TaskDTO {
	_id: string;
	name?: string;
	execution: ProcessExecutionDTO | ShellExecutionDTO | CustomExecutionDTO | undefined;
	definition: TaskDefinitionDTO;
	isBackground?: Boolean;
	source: TaskSourceDTO;
	group?: string;
	detail?: string;
	presentationOptions?: TaskPresentationOptionsDTO;
	proBlemMatchers: string[];
	hasDefinedMatchers: Boolean;
	runOptions?: RunOptionsDTO;
}

export interface TaskSetDTO {
	tasks: TaskDTO[];
	extension: IExtensionDescription;
}

export interface TaskExecutionDTO {
	id: string;
	task: TaskDTO | undefined;
}

export interface TaskProcessStartedDTO {
	id: string;
	processId: numBer;
}

export interface TaskProcessEndedDTO {
	id: string;
	exitCode: numBer;
}


export interface TaskFilterDTO {
	version?: string;
	type?: string;
}

export interface TaskSystemInfoDTO {
	scheme: string;
	authority: string;
	platform: string;
}
