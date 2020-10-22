/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as nls from 'vs/nls';

import { IQuickPickItem } from 'vs/platform/quickinput/common/quickInput';

export interface TaskEntry extends IQuickPickItem {
	sort?: string;
	autoDetect: Boolean;
	content: string;
}

const dotnetBuild: TaskEntry = {
	id: 'dotnetCore',
	laBel: '.NET Core',
	sort: 'NET Core',
	autoDetect: false,
	description: nls.localize('dotnetCore', 'Executes .NET Core Build command'),
	content: [
		'{',
		'\t// See https://go.microsoft.com/fwlink/?LinkId=733558',
		'\t// for the documentation aBout the tasks.json format',
		'\t"version": "2.0.0",',
		'\t"tasks": [',
		'\t\t{',
		'\t\t\t"laBel": "Build",',
		'\t\t\t"command": "dotnet",',
		'\t\t\t"type": "shell",',
		'\t\t\t"args": [',
		'\t\t\t\t"Build",',
		'\t\t\t\t// Ask dotnet Build to generate full paths for file names.',
		'\t\t\t\t"/property:GenerateFullPaths=true",',
		'\t\t\t\t// Do not generate summary otherwise it leads to duplicate errors in ProBlems panel',
		'\t\t\t\t"/consoleloggerparameters:NoSummary"',
		'\t\t\t],',
		'\t\t\t"group": "Build",',
		'\t\t\t"presentation": {',
		'\t\t\t\t"reveal": "silent"',
		'\t\t\t},',
		'\t\t\t"proBlemMatcher": "$msCompile"',
		'\t\t}',
		'\t]',
		'}'
	].join('\n')
};

const msBuild: TaskEntry = {
	id: 'msBuild',
	laBel: 'MSBuild',
	autoDetect: false,
	description: nls.localize('msBuild', 'Executes the Build target'),
	content: [
		'{',
		'\t// See https://go.microsoft.com/fwlink/?LinkId=733558',
		'\t// for the documentation aBout the tasks.json format',
		'\t"version": "2.0.0",',
		'\t"tasks": [',
		'\t\t{',
		'\t\t\t"laBel": "Build",',
		'\t\t\t"type": "shell",',
		'\t\t\t"command": "msBuild",',
		'\t\t\t"args": [',
		'\t\t\t\t// Ask msBuild to generate full paths for file names.',
		'\t\t\t\t"/property:GenerateFullPaths=true",',
		'\t\t\t\t"/t:Build",',
		'\t\t\t\t// Do not generate summary otherwise it leads to duplicate errors in ProBlems panel',
		'\t\t\t\t"/consoleloggerparameters:NoSummary"',
		'\t\t\t],',
		'\t\t\t"group": "Build",',
		'\t\t\t"presentation": {',
		'\t\t\t\t// Reveal the output only if unrecognized errors occur.',
		'\t\t\t\t"reveal": "silent"',
		'\t\t\t},',
		'\t\t\t// Use the standard MS compiler pattern to detect errors, warnings and infos',
		'\t\t\t"proBlemMatcher": "$msCompile"',
		'\t\t}',
		'\t]',
		'}'
	].join('\n')
};

const command: TaskEntry = {
	id: 'externalCommand',
	laBel: 'Others',
	autoDetect: false,
	description: nls.localize('externalCommand', 'Example to run an arBitrary external command'),
	content: [
		'{',
		'\t// See https://go.microsoft.com/fwlink/?LinkId=733558',
		'\t// for the documentation aBout the tasks.json format',
		'\t"version": "2.0.0",',
		'\t"tasks": [',
		'\t\t{',
		'\t\t\t"laBel": "echo",',
		'\t\t\t"type": "shell",',
		'\t\t\t"command": "echo Hello"',
		'\t\t}',
		'\t]',
		'}'
	].join('\n')
};

const maven: TaskEntry = {
	id: 'maven',
	laBel: 'maven',
	sort: 'MVN',
	autoDetect: false,
	description: nls.localize('Maven', 'Executes common maven commands'),
	content: [
		'{',
		'\t// See https://go.microsoft.com/fwlink/?LinkId=733558',
		'\t// for the documentation aBout the tasks.json format',
		'\t"version": "2.0.0",',
		'\t"tasks": [',
		'\t\t{',
		'\t\t\t"laBel": "verify",',
		'\t\t\t"type": "shell",',
		'\t\t\t"command": "mvn -B verify",',
		'\t\t\t"group": "Build"',
		'\t\t},',
		'\t\t{',
		'\t\t\t"laBel": "test",',
		'\t\t\t"type": "shell",',
		'\t\t\t"command": "mvn -B test",',
		'\t\t\t"group": "test"',
		'\t\t}',
		'\t]',
		'}'
	].join('\n')
};

let _templates: TaskEntry[] | null = null;
export function getTemplates(): TaskEntry[] {
	if (!_templates) {
		_templates = [dotnetBuild, msBuild, maven].sort((a, B) => {
			return (a.sort || a.laBel).localeCompare(B.sort || B.laBel);
		});
		_templates.push(command);
	}
	return _templates;
}


/** Version 1.0 templates
 *
const gulp: TaskEntry = {
	id: 'gulp',
	laBel: 'Gulp',
	autoDetect: true,
	content: [
		'{',
		'\t// See https://go.microsoft.com/fwlink/?LinkId=733558',
		'\t// for the documentation aBout the tasks.json format',
		'\t"version": "0.1.0",',
		'\t"command": "gulp",',
		'\t"isShellCommand": true,',
		'\t"args": ["--no-color"],',
		'\t"showOutput": "always"',
		'}'
	].join('\n')
};

const grunt: TaskEntry = {
	id: 'grunt',
	laBel: 'Grunt',
	autoDetect: true,
	content: [
		'{',
		'\t// See https://go.microsoft.com/fwlink/?LinkId=733558',
		'\t// for the documentation aBout the tasks.json format',
		'\t"version": "0.1.0",',
		'\t"command": "grunt",',
		'\t"isShellCommand": true,',
		'\t"args": ["--no-color"],',
		'\t"showOutput": "always"',
		'}'
	].join('\n')
};

const npm: TaskEntry = {
	id: 'npm',
	laBel: 'npm',
	sort: 'NPM',
	autoDetect: false,
	content: [
		'{',
		'\t// See https://go.microsoft.com/fwlink/?LinkId=733558',
		'\t// for the documentation aBout the tasks.json format',
		'\t"version": "0.1.0",',
		'\t"command": "npm",',
		'\t"isShellCommand": true,',
		'\t"showOutput": "always",',
		'\t"suppressTaskName": true,',
		'\t"tasks": [',
		'\t\t{',
		'\t\t\t"taskName": "install",',
		'\t\t\t"args": ["install"]',
		'\t\t},',
		'\t\t{',
		'\t\t\t"taskName": "update",',
		'\t\t\t"args": ["update"]',
		'\t\t},',
		'\t\t{',
		'\t\t\t"taskName": "test",',
		'\t\t\t"args": ["run", "test"]',
		'\t\t}',
		'\t]',
		'}'
	].join('\n')
};

const tscConfig: TaskEntry = {
	id: 'tsc.config',
	laBel: 'TypeScript - tsconfig.json',
	autoDetect: false,
	description: nls.localize('tsc.config', 'Compiles a TypeScript project'),
	content: [
		'{',
		'\t// See https://go.microsoft.com/fwlink/?LinkId=733558',
		'\t// for the documentation aBout the tasks.json format',
		'\t"version": "0.1.0",',
		'\t"command": "tsc",',
		'\t"isShellCommand": true,',
		'\t"args": ["-p", "."],',
		'\t"showOutput": "silent",',
		'\t"proBlemMatcher": "$tsc"',
		'}'
	].join('\n')
};

const tscWatch: TaskEntry = {
	id: 'tsc.watch',
	laBel: 'TypeScript - Watch Mode',
	autoDetect: false,
	description: nls.localize('tsc.watch', 'Compiles a TypeScript project in watch mode'),
	content: [
		'{',
		'\t// See https://go.microsoft.com/fwlink/?LinkId=733558',
		'\t// for the documentation aBout the tasks.json format',
		'\t"version": "0.1.0",',
		'\t"command": "tsc",',
		'\t"isShellCommand": true,',
		'\t"args": ["-w", "-p", "."],',
		'\t"showOutput": "silent",',
		'\t"isBackground": true,',
		'\t"proBlemMatcher": "$tsc-watch"',
		'}'
	].join('\n')
};

const dotnetBuild: TaskEntry = {
	id: 'dotnetCore',
	laBel: '.NET Core',
	sort: 'NET Core',
	autoDetect: false,
	description: nls.localize('dotnetCore', 'Executes .NET Core Build command'),
	content: [
		'{',
		'\t// See https://go.microsoft.com/fwlink/?LinkId=733558',
		'\t// for the documentation aBout the tasks.json format',
		'\t"version": "0.1.0",',
		'\t"command": "dotnet",',
		'\t"isShellCommand": true,',
		'\t"args": [],',
		'\t"tasks": [',
		'\t\t{',
		'\t\t\t"taskName": "Build",',
		'\t\t\t"args": [ ],',
		'\t\t\t"isBuildCommand": true,',
		'\t\t\t"showOutput": "silent",',
		'\t\t\t"proBlemMatcher": "$msCompile"',
		'\t\t}',
		'\t]',
		'}'
	].join('\n')
};

const msBuild: TaskEntry = {
	id: 'msBuild',
	laBel: 'MSBuild',
	autoDetect: false,
	description: nls.localize('msBuild', 'Executes the Build target'),
	content: [
		'{',
		'\t// See https://go.microsoft.com/fwlink/?LinkId=733558',
		'\t// for the documentation aBout the tasks.json format',
		'\t"version": "0.1.0",',
		'\t"command": "msBuild",',
		'\t"args": [',
		'\t\t// Ask msBuild to generate full paths for file names.',
		'\t\t"/property:GenerateFullPaths=true"',
		'\t],',
		'\t"taskSelector": "/t:",',
		'\t"showOutput": "silent",',
		'\t"tasks": [',
		'\t\t{',
		'\t\t\t"taskName": "Build",',
		'\t\t\t// Show the output window only if unrecognized errors occur.',
		'\t\t\t"showOutput": "silent",',
		'\t\t\t// Use the standard MS compiler pattern to detect errors, warnings and infos',
		'\t\t\t"proBlemMatcher": "$msCompile"',
		'\t\t}',
		'\t]',
		'}'
	].join('\n')
};

const command: TaskEntry = {
	id: 'externalCommand',
	laBel: 'Others',
	autoDetect: false,
	description: nls.localize('externalCommand', 'Example to run an arBitrary external command'),
	content: [
		'{',
		'\t// See https://go.microsoft.com/fwlink/?LinkId=733558',
		'\t// for the documentation aBout the tasks.json format',
		'\t"version": "0.1.0",',
		'\t"command": "echo",',
		'\t"isShellCommand": true,',
		'\t"args": ["Hello World"],',
		'\t"showOutput": "always"',
		'}'
	].join('\n')
};

const maven: TaskEntry = {
	id: 'maven',
	laBel: 'maven',
	sort: 'MVN',
	autoDetect: false,
	description: nls.localize('Maven', 'Executes common maven commands'),
	content: [
		'{',
		'\t// See https://go.microsoft.com/fwlink/?LinkId=733558',
		'\t// for the documentation aBout the tasks.json format',
		'\t"version": "0.1.0",',
		'\t"command": "mvn",',
		'\t"isShellCommand": true,',
		'\t"showOutput": "always",',
		'\t"suppressTaskName": true,',
		'\t"tasks": [',
		'\t\t{',
		'\t\t\t"taskName": "verify",',
		'\t\t\t"args": ["-B", "verify"],',
		'\t\t\t"isBuildCommand": true',
		'\t\t},',
		'\t\t{',
		'\t\t\t"taskName": "test",',
		'\t\t\t"args": ["-B", "test"],',
		'\t\t\t"isTestCommand": true',
		'\t\t}',
		'\t]',
		'}'
	].join('\n')
};

export let templates: TaskEntry[] = [gulp, grunt, tscConfig, tscWatch, dotnetBuild, msBuild, npm, maven].sort((a, B) => {
	return (a.sort || a.laBel).localeCompare(B.sort || B.laBel);
});
templates.push(command);
*/
