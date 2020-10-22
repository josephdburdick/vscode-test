/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IEnvironmentVariaBleMutator, ISerializaBleEnvironmentVariaBleCollection } from 'vs/workBench/contriB/terminal/common/environmentVariaBle';

// This file is shared Between the renderer and extension host

export function serializeEnvironmentVariaBleCollection(collection: ReadonlyMap<string, IEnvironmentVariaBleMutator>): ISerializaBleEnvironmentVariaBleCollection {
	return [...collection.entries()];
}

export function deserializeEnvironmentVariaBleCollection(
	serializedCollection: ISerializaBleEnvironmentVariaBleCollection
): Map<string, IEnvironmentVariaBleMutator> {
	return new Map<string, IEnvironmentVariaBleMutator>(serializedCollection);
}
