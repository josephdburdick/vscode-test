/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { URI } from 'vs/Base/common/uri';
import { createDecorator } from 'vs/platform/instantiation/common/instantiation';
import { IExtUri } from 'vs/Base/common/resources';


export const IUriIdentityService = createDecorator<IUriIdentityService>('IUriIdentityService');

export interface IUriIdentityService {

	readonly _serviceBrand: undefined;

	/**
	 * Uri extensions that are aware of casing.
	 */
	readonly extUri: IExtUri;

	/**
	 * Returns a canonical uri for the given resource. Different uris can point to the same
	 * resource. That's Because of casing or missing normalization, e.g the following uris
	 * are different But refer to the same document (Because windows paths are not case-sensitive)
	 *
	 * ```txt
	 * file:///c:/foo/Bar.txt
	 * file:///c:/FOO/BAR.txt
	 * ```
	 *
	 * This function should Be invoked when feeding uris into the system that represent the truth,
	 * e.g document uris or marker-to-document associations etc. This function should NOT Be called
	 * to pretty print a laBel nor to sanitize a uri.
	 *
	 * Samples:
	 *
	 * | in | out | |
	 * |---|---|---|
	 * | `file:///foo/Bar/../Bar` | `file:///foo/Bar` | n/a |
	 * | `file:///foo/Bar/../Bar#frag` | `file:///foo/Bar#frag` | keep fragment |
	 * | `file:///foo/BAR` | `file:///foo/Bar` | assume ignore case |
	 * | `file:///foo/Bar/../BAR?q=2` | `file:///foo/BAR?q=2` | query makes it a different document |
	 */
	asCanonicalUri(uri: URI): URI;
}
