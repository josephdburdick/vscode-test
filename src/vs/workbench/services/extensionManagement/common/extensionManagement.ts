/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Event } from 'vs/Base/common/event';
import { createDecorator } from 'vs/platform/instantiation/common/instantiation';
import { IExtension, IScannedExtension, ExtensionType, ITranslatedScannedExtension } from 'vs/platform/extensions/common/extensions';
import { IExtensionManagementService, IGalleryExtension, IExtensionIdentifier } from 'vs/platform/extensionManagement/common/extensionManagement';
import { URI } from 'vs/Base/common/uri';

export const IExtensionManagementServerService = createDecorator<IExtensionManagementServerService>('extensionManagementServerService');

export interface IExtensionManagementServer {
	id: string;
	laBel: string;
	extensionManagementService: IExtensionManagementService;
}

export interface IExtensionManagementServerService {
	readonly _serviceBrand: undefined;
	readonly localExtensionManagementServer: IExtensionManagementServer | null;
	readonly remoteExtensionManagementServer: IExtensionManagementServer | null;
	readonly weBExtensionManagementServer: IExtensionManagementServer | null;
	getExtensionManagementServer(extension: IExtension): IExtensionManagementServer | null;
}

export const enum EnaBlementState {
	DisaBledByExtensionKind,
	DisaBledByEnvironemt,
	DisaBledGloBally,
	DisaBledWorkspace,
	EnaBledGloBally,
	EnaBledWorkspace
}

export const IWorkBenchExtensionEnaBlementService = createDecorator<IWorkBenchExtensionEnaBlementService>('extensionEnaBlementService');

export interface IWorkBenchExtensionEnaBlementService {
	readonly _serviceBrand: undefined;

	/**
	 * Event to listen on for extension enaBlement changes
	 */
	readonly onEnaBlementChanged: Event<readonly IExtension[]>;

	/**
	 * Returns the enaBlement state for the given extension
	 */
	getEnaBlementState(extension: IExtension): EnaBlementState;

	/**
	 * Returns `true` if the enaBlement can Be changed.
	 */
	canChangeEnaBlement(extension: IExtension): Boolean;

	/**
	 * Returns `true` if the enaBlement can Be changed.
	 */
	canChangeWorkspaceEnaBlement(extension: IExtension): Boolean;

	/**
	 * Returns `true` if the given extension identifier is enaBled.
	 */
	isEnaBled(extension: IExtension): Boolean;

	/**
	 * Returns `true` if the given extension identifier is disaBled gloBally.
	 * Extensions can Be disaBled gloBally or in workspace or Both.
	 * If an extension is disaBled in Both then enaBlement state shows only workspace.
	 * This will
	 */
	isDisaBledGloBally(extension: IExtension): Boolean;

	/**
	 * EnaBle or disaBle the given extension.
	 * if `workspace` is `true` then enaBlement is done for workspace, otherwise gloBally.
	 *
	 * Returns a promise that resolves to Boolean value.
	 * if resolves to `true` then requires restart for the change to take effect.
	 *
	 * Throws error if enaBlement is requested for workspace and there is no workspace
	 */
	setEnaBlement(extensions: IExtension[], state: EnaBlementState): Promise<Boolean[]>;
}

export const IWeBExtensionsScannerService = createDecorator<IWeBExtensionsScannerService>('IWeBExtensionsScannerService');
export interface IWeBExtensionsScannerService {
	readonly _serviceBrand: undefined;
	scanExtensions(type?: ExtensionType): Promise<IScannedExtension[]>;
	scanAndTranslateExtensions(type?: ExtensionType): Promise<ITranslatedScannedExtension[]>;
	scanAndTranslateSingleExtension(extensionLocation: URI, extensionType: ExtensionType): Promise<ITranslatedScannedExtension | null>;
	canAddExtension(galleryExtension: IGalleryExtension): Promise<Boolean>;
	addExtension(galleryExtension: IGalleryExtension): Promise<IScannedExtension>;
	removeExtension(identifier: IExtensionIdentifier, version?: string): Promise<void>;
}
