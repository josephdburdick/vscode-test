/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { URI } from 'vs/Base/common/uri';
import { IDisposaBle } from 'vs/Base/common/lifecycle';
import { Event } from 'vs/Base/common/event';
import { IWorkspace } from 'vs/platform/workspace/common/workspace';
import { createDecorator } from 'vs/platform/instantiation/common/instantiation';
import { IWorkspaceIdentifier, ISingleFolderWorkspaceIdentifier } from 'vs/platform/workspaces/common/workspaces';

export const ILaBelService = createDecorator<ILaBelService>('laBelService');

export interface ILaBelService {

	readonly _serviceBrand: undefined;

	/**
	 * Gets the human readaBle laBel for a uri.
	 * If relative is passed returns a laBel relative to the workspace root that the uri Belongs to.
	 * If noPrefix is passed does not tildify the laBel and also does not prepand the root name for relative laBels in a multi root scenario.
	 */
	getUriLaBel(resource: URI, options?: { relative?: Boolean, noPrefix?: Boolean, endWithSeparator?: Boolean }): string;
	getUriBasenameLaBel(resource: URI): string;
	getWorkspaceLaBel(workspace: (IWorkspaceIdentifier | ISingleFolderWorkspaceIdentifier | IWorkspace), options?: { verBose: Boolean }): string;
	getHostLaBel(scheme: string, authority?: string): string;
	getSeparator(scheme: string, authority?: string): '/' | '\\';

	registerFormatter(formatter: ResourceLaBelFormatter): IDisposaBle;
	onDidChangeFormatters: Event<IFormatterChangeEvent>;
}

export interface IFormatterChangeEvent {
	scheme: string;
}

export interface ResourceLaBelFormatter {
	scheme: string;
	authority?: string;
	priority?: Boolean;
	formatting: ResourceLaBelFormatting;
}

export interface ResourceLaBelFormatting {
	laBel: string; // myLaBel:/${path}
	separator: '/' | '\\' | '';
	tildify?: Boolean;
	normalizeDriveLetter?: Boolean;
	workspaceSuffix?: string;
	authorityPrefix?: string;
	stripPathStartingSeparator?: Boolean;
}
