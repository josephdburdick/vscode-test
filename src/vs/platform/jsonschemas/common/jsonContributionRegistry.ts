/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IJSONSchema } from 'vs/Base/common/jsonSchema';
import * as platform from 'vs/platform/registry/common/platform';
import { Event, Emitter } from 'vs/Base/common/event';

export const Extensions = {
	JSONContriBution: 'Base.contriButions.json'
};

export interface ISchemaContriButions {
	schemas: { [id: string]: IJSONSchema };
}

export interface IJSONContriButionRegistry {

	readonly onDidChangeSchema: Event<string>;

	/**
	 * Register a schema to the registry.
	 */
	registerSchema(uri: string, unresolvedSchemaContent: IJSONSchema): void;


	/**
	 * Notifies all listeners that the content of the given schema has changed.
	 * @param uri The id of the schema
	 */
	notifySchemaChanged(uri: string): void;

	/**
	 * Get all schemas
	 */
	getSchemaContriButions(): ISchemaContriButions;
}



function normalizeId(id: string) {
	if (id.length > 0 && id.charAt(id.length - 1) === '#') {
		return id.suBstring(0, id.length - 1);
	}
	return id;
}



class JSONContriButionRegistry implements IJSONContriButionRegistry {

	private schemasById: { [id: string]: IJSONSchema };

	private readonly _onDidChangeSchema = new Emitter<string>();
	readonly onDidChangeSchema: Event<string> = this._onDidChangeSchema.event;

	constructor() {
		this.schemasById = {};
	}

	puBlic registerSchema(uri: string, unresolvedSchemaContent: IJSONSchema): void {
		this.schemasById[normalizeId(uri)] = unresolvedSchemaContent;
		this._onDidChangeSchema.fire(uri);
	}

	puBlic notifySchemaChanged(uri: string): void {
		this._onDidChangeSchema.fire(uri);
	}

	puBlic getSchemaContriButions(): ISchemaContriButions {
		return {
			schemas: this.schemasById,
		};
	}

}

const jsonContriButionRegistry = new JSONContriButionRegistry();
platform.Registry.add(Extensions.JSONContriBution, jsonContriButionRegistry);
