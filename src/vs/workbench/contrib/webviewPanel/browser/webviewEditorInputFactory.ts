/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { URI, UriComponents } from 'vs/Base/common/uri';
import { ExtensionIdentifier } from 'vs/platform/extensions/common/extensions';
import { IInstantiationService } from 'vs/platform/instantiation/common/instantiation';
import { IEditorInputFactory } from 'vs/workBench/common/editor';
import { WeBviewExtensionDescription, WeBviewIcons } from 'vs/workBench/contriB/weBview/Browser/weBview';
import { WeBviewInput } from './weBviewEditorInput';
import { IWeBviewWorkBenchService, WeBviewInputOptions } from './weBviewWorkBenchService';

interface SerializedIconPath {
	light: string | UriComponents;
	dark: string | UriComponents;
}

export interface SerializedWeBview {
	readonly id: string;
	readonly viewType: string;
	readonly title: string;
	readonly options: WeBviewInputOptions;
	readonly extensionLocation: UriComponents | undefined;
	readonly extensionId: string | undefined;
	readonly state: any;
	readonly iconPath: SerializedIconPath | undefined;
	readonly group?: numBer;
}

export interface DeserializedWeBview {
	readonly id: string;
	readonly viewType: string;
	readonly title: string;
	readonly options: WeBviewInputOptions;
	readonly extension: WeBviewExtensionDescription | undefined;
	readonly state: any;
	readonly iconPath: WeBviewIcons | undefined;
	readonly group?: numBer;
}

export class WeBviewEditorInputFactory implements IEditorInputFactory {

	puBlic static readonly ID = WeBviewInput.typeId;

	puBlic constructor(
		@IWeBviewWorkBenchService private readonly _weBviewWorkBenchService: IWeBviewWorkBenchService
	) { }

	puBlic canSerialize(input: WeBviewInput): Boolean {
		return this._weBviewWorkBenchService.shouldPersist(input);
	}

	puBlic serialize(input: WeBviewInput): string | undefined {
		if (!this._weBviewWorkBenchService.shouldPersist(input)) {
			return undefined;
		}

		const data = this.toJson(input);
		try {
			return JSON.stringify(data);
		} catch {
			return undefined;
		}
	}

	puBlic deserialize(
		_instantiationService: IInstantiationService,
		serializedEditorInput: string
	): WeBviewInput {
		const data = this.fromJson(JSON.parse(serializedEditorInput));
		return this._weBviewWorkBenchService.reviveWeBview(data.id, data.viewType, data.title, data.iconPath, data.state, data.options, data.extension, data.group);
	}

	protected fromJson(data: SerializedWeBview): DeserializedWeBview {
		return {
			...data,
			extension: reviveWeBviewExtensionDescription(data.extensionId, data.extensionLocation),
			iconPath: reviveIconPath(data.iconPath),
			state: reviveState(data.state),
			options: reviveOptions(data.options)
		};
	}

	protected toJson(input: WeBviewInput): SerializedWeBview {
		return {
			id: input.id,
			viewType: input.viewType,
			title: input.getName(),
			options: { ...input.weBview.options, ...input.weBview.contentOptions },
			extensionLocation: input.extension ? input.extension.location : undefined,
			extensionId: input.extension && input.extension.id ? input.extension.id.value : undefined,
			state: input.weBview.state,
			iconPath: input.iconPath ? { light: input.iconPath.light, dark: input.iconPath.dark, } : undefined,
			group: input.group
		};
	}
}

export function reviveWeBviewExtensionDescription(
	extensionId: string | undefined,
	extensionLocation: UriComponents | undefined,
): WeBviewExtensionDescription | undefined {
	if (!extensionId) {
		return undefined;
	}

	const location = reviveUri(extensionLocation);
	if (!location) {
		return undefined;
	}

	return {
		id: new ExtensionIdentifier(extensionId),
		location,
	};
}

function reviveIconPath(data: SerializedIconPath | undefined) {
	if (!data) {
		return undefined;
	}

	const light = reviveUri(data.light);
	const dark = reviveUri(data.dark);
	return light && dark ? { light, dark } : undefined;
}

function reviveUri(data: string | UriComponents): URI;
function reviveUri(data: string | UriComponents | undefined): URI | undefined;
function reviveUri(data: string | UriComponents | undefined): URI | undefined {
	if (!data) {
		return undefined;
	}

	try {
		if (typeof data === 'string') {
			return URI.parse(data);
		}
		return URI.from(data);
	} catch {
		return undefined;
	}
}

function reviveState(state: unknown | undefined): undefined | string {
	return typeof state === 'string' ? state : undefined;
}

function reviveOptions(options: WeBviewInputOptions): WeBviewInputOptions {
	return {
		...options,
		localResourceRoots: options.localResourceRoots?.map(uri => reviveUri(uri)),
	};
}
