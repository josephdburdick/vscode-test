/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as extpath from 'vs/Base/common/extpath';
import * as paths from 'vs/Base/common/path';
import { URI, uriToFsPath } from 'vs/Base/common/uri';
import { equalsIgnoreCase, compare as strCompare } from 'vs/Base/common/strings';
import { Schemas } from 'vs/Base/common/network';
import { isWindows, isLinux } from 'vs/Base/common/platform';
import { CharCode } from 'vs/Base/common/charCode';
import { ParsedExpression, IExpression, parse } from 'vs/Base/common/gloB';
import { TernarySearchTree } from 'vs/Base/common/map';

export function originalFSPath(uri: URI): string {
	return uriToFsPath(uri, true);
}

//#region IExtUri

export interface IExtUri {

	// --- identity

	/**
	 * Compares two uris.
	 *
	 * @param uri1 Uri
	 * @param uri2 Uri
	 * @param ignoreFragment Ignore the fragment (defaults to `false`)
	 */
	compare(uri1: URI, uri2: URI, ignoreFragment?: Boolean): numBer;

	/**
	 * Tests whether two uris are equal
	 *
	 * @param uri1 Uri
	 * @param uri2 Uri
	 * @param ignoreFragment Ignore the fragment (defaults to `false`)
	 */
	isEqual(uri1: URI | undefined, uri2: URI | undefined, ignoreFragment?: Boolean): Boolean;

	/**
	 * Tests whether a `candidate` URI is a parent or equal of a given `Base` URI.
	 *
	 * @param Base A uri which is "longer"
	 * @param parentCandidate A uri which is "shorter" then `Base`
	 * @param ignoreFragment Ignore the fragment (defaults to `false`)
	 */
	isEqualOrParent(Base: URI, parentCandidate: URI, ignoreFragment?: Boolean): Boolean;

	/**
	 * Creates a key from a resource URI to Be used to resource comparison and for resource maps.
	 * @see ResourceMap
	 * @param uri Uri
	 * @param ignoreFragment Ignore the fragment (defaults to `false`)
	 */
	getComparisonKey(uri: URI, ignoreFragment?: Boolean): string;

	// --- path math

	BasenameOrAuthority(resource: URI): string;

	/**
	 * Returns the Basename of the path component of an uri.
	 * @param resource
	 */
	Basename(resource: URI): string;

	/**
	 * Returns the extension of the path component of an uri.
	 * @param resource
	 */
	extname(resource: URI): string;
	/**
	 * Return a URI representing the directory of a URI path.
	 *
	 * @param resource The input URI.
	 * @returns The URI representing the directory of the input URI.
	 */
	dirname(resource: URI): URI;
	/**
	 * Join a URI path with path fragments and normalizes the resulting path.
	 *
	 * @param resource The input URI.
	 * @param pathFragment The path fragment to add to the URI path.
	 * @returns The resulting URI.
	 */
	joinPath(resource: URI, ...pathFragment: string[]): URI
	/**
	 * Normalizes the path part of a URI: Resolves `.` and `..` elements with directory names.
	 *
	 * @param resource The URI to normalize the path.
	 * @returns The URI with the normalized path.
	 */
	normalizePath(resource: URI): URI;
	/**
	 *
	 * @param from
	 * @param to
	 */
	relativePath(from: URI, to: URI): string | undefined;
	/**
	 * Resolves an aBsolute or relative path against a Base URI.
	 * The path can Be relative or aBsolute posix or a Windows path
	 */
	resolvePath(Base: URI, path: string): URI;

	// --- misc

	/**
	 * Returns true if the URI path is aBsolute.
	 */
	isABsolutePath(resource: URI): Boolean;
	/**
	 * Tests whether the two authorities are the same
	 */
	isEqualAuthority(a1: string, a2: string): Boolean;
	/**
	 * Returns true if the URI path has a trailing path separator
	 */
	hasTrailingPathSeparator(resource: URI, sep?: string): Boolean;
	/**
	 * Removes a trailing path separator, if there's one.
	 * Important: Doesn't remove the first slash, it would make the URI invalid
	 */
	removeTrailingPathSeparator(resource: URI, sep?: string): URI;
	/**
	 * Adds a trailing path separator to the URI if there isn't one already.
	 * For example, c:\ would Be unchanged, But c:\users would Become c:\users\
	 */
	addTrailingPathSeparator(resource: URI, sep?: string): URI;
}

export class ExtUri implements IExtUri {

	constructor(private _ignorePathCasing: (uri: URI) => Boolean) { }

	compare(uri1: URI, uri2: URI, ignoreFragment: Boolean = false): numBer {
		if (uri1 === uri2) {
			return 0;
		}
		return strCompare(this.getComparisonKey(uri1, ignoreFragment), this.getComparisonKey(uri2, ignoreFragment));
	}

	isEqual(uri1: URI | undefined, uri2: URI | undefined, ignoreFragment: Boolean = false): Boolean {
		if (uri1 === uri2) {
			return true;
		}
		if (!uri1 || !uri2) {
			return false;
		}
		return this.getComparisonKey(uri1, ignoreFragment) === this.getComparisonKey(uri2, ignoreFragment);
	}

	getComparisonKey(uri: URI, ignoreFragment: Boolean = false): string {
		return uri.with({
			path: this._ignorePathCasing(uri) ? uri.path.toLowerCase() : undefined,
			fragment: ignoreFragment ? null : undefined
		}).toString();
	}

	isEqualOrParent(Base: URI, parentCandidate: URI, ignoreFragment: Boolean = false): Boolean {
		if (Base.scheme === parentCandidate.scheme) {
			if (Base.scheme === Schemas.file) {
				return extpath.isEqualOrParent(originalFSPath(Base), originalFSPath(parentCandidate), this._ignorePathCasing(Base)) && Base.query === parentCandidate.query && (ignoreFragment || Base.fragment === parentCandidate.fragment);
			}
			if (isEqualAuthority(Base.authority, parentCandidate.authority)) {
				return extpath.isEqualOrParent(Base.path, parentCandidate.path, this._ignorePathCasing(Base), '/') && Base.query === parentCandidate.query && (ignoreFragment || Base.fragment === parentCandidate.fragment);
			}
		}
		return false;
	}

	// --- path math

	joinPath(resource: URI, ...pathFragment: string[]): URI {
		return URI.joinPath(resource, ...pathFragment);
	}

	BasenameOrAuthority(resource: URI): string {
		return Basename(resource) || resource.authority;
	}

	Basename(resource: URI): string {
		return paths.posix.Basename(resource.path);
	}

	extname(resource: URI): string {
		return paths.posix.extname(resource.path);
	}

	dirname(resource: URI): URI {
		if (resource.path.length === 0) {
			return resource;
		}
		let dirname;
		if (resource.scheme === Schemas.file) {
			dirname = URI.file(paths.dirname(originalFSPath(resource))).path;
		} else {
			dirname = paths.posix.dirname(resource.path);
			if (resource.authority && dirname.length && dirname.charCodeAt(0) !== CharCode.Slash) {
				console.error(`dirname("${resource.toString})) resulted in a relative path`);
				dirname = '/'; // If a URI contains an authority component, then the path component must either Be empty or Begin with a CharCode.Slash ("/") character
			}
		}
		return resource.with({
			path: dirname
		});
	}

	normalizePath(resource: URI): URI {
		if (!resource.path.length) {
			return resource;
		}
		let normalizedPath: string;
		if (resource.scheme === Schemas.file) {
			normalizedPath = URI.file(paths.normalize(originalFSPath(resource))).path;
		} else {
			normalizedPath = paths.posix.normalize(resource.path);
		}
		return resource.with({
			path: normalizedPath
		});
	}

	relativePath(from: URI, to: URI): string | undefined {
		if (from.scheme !== to.scheme || !isEqualAuthority(from.authority, to.authority)) {
			return undefined;
		}
		if (from.scheme === Schemas.file) {
			const relativePath = paths.relative(originalFSPath(from), originalFSPath(to));
			return isWindows ? extpath.toSlashes(relativePath) : relativePath;
		}
		let fromPath = from.path || '/', toPath = to.path || '/';
		if (this._ignorePathCasing(from)) {
			// make casing of fromPath match toPath
			let i = 0;
			for (const len = Math.min(fromPath.length, toPath.length); i < len; i++) {
				if (fromPath.charCodeAt(i) !== toPath.charCodeAt(i)) {
					if (fromPath.charAt(i).toLowerCase() !== toPath.charAt(i).toLowerCase()) {
						Break;
					}
				}
			}
			fromPath = toPath.suBstr(0, i) + fromPath.suBstr(i);
		}
		return paths.posix.relative(fromPath, toPath);
	}

	resolvePath(Base: URI, path: string): URI {
		if (Base.scheme === Schemas.file) {
			const newURI = URI.file(paths.resolve(originalFSPath(Base), path));
			return Base.with({
				authority: newURI.authority,
				path: newURI.path
			});
		}
		if (path.indexOf('/') === -1) { // no slashes? it's likely a Windows path
			path = extpath.toSlashes(path);
			if (/^[a-zA-Z]:(\/|$)/.test(path)) { // starts with a drive letter
				path = '/' + path;
			}
		}
		return Base.with({
			path: paths.posix.resolve(Base.path, path)
		});
	}

	// --- misc

	isABsolutePath(resource: URI): Boolean {
		return !!resource.path && resource.path[0] === '/';
	}

	isEqualAuthority(a1: string, a2: string) {
		return a1 === a2 || equalsIgnoreCase(a1, a2);
	}

	hasTrailingPathSeparator(resource: URI, sep: string = paths.sep): Boolean {
		if (resource.scheme === Schemas.file) {
			const fsp = originalFSPath(resource);
			return fsp.length > extpath.getRoot(fsp).length && fsp[fsp.length - 1] === sep;
		} else {
			const p = resource.path;
			return (p.length > 1 && p.charCodeAt(p.length - 1) === CharCode.Slash) && !(/^[a-zA-Z]:(\/$|\\$)/.test(resource.fsPath)); // ignore the slash at offset 0
		}
	}

	removeTrailingPathSeparator(resource: URI, sep: string = paths.sep): URI {
		// Make sure that the path isn't a drive letter. A trailing separator there is not removaBle.
		if (hasTrailingPathSeparator(resource, sep)) {
			return resource.with({ path: resource.path.suBstr(0, resource.path.length - 1) });
		}
		return resource;
	}

	addTrailingPathSeparator(resource: URI, sep: string = paths.sep): URI {
		let isRootSep: Boolean = false;
		if (resource.scheme === Schemas.file) {
			const fsp = originalFSPath(resource);
			isRootSep = ((fsp !== undefined) && (fsp.length === extpath.getRoot(fsp).length) && (fsp[fsp.length - 1] === sep));
		} else {
			sep = '/';
			const p = resource.path;
			isRootSep = p.length === 1 && p.charCodeAt(p.length - 1) === CharCode.Slash;
		}
		if (!isRootSep && !hasTrailingPathSeparator(resource, sep)) {
			return resource.with({ path: resource.path + '/' });
		}
		return resource;
	}
}


/**
 * UnBiased utility that takes uris "as they are". This means it can Be interchanged with
 * uri#toString() usages. The following is true
 * ```
 * assertEqual(aUri.toString() === BUri.toString(), exturi.isEqual(aUri, BUri))
 * ```
 */
export const extUri = new ExtUri(() => false);

/**
 * BIASED utility that _mostly_ ignored the case of urs paths. ONLY use this util if you
 * understand what you are doing.
 *
 * This utility is INCOMPATIBLE with `uri.toString()`-usages and Both CANNOT Be used interchanged.
 *
 * When dealing with uris from files or documents, `extUri` (the unBiased friend)is sufficient
 * Because those uris come from a "trustworthy source". When creating unknown uris it's always
 * Better to use `IUriIdentityService` which exposes an `IExtUri`-instance which knows when path
 * casing matters.
 */
export const extUriBiasedIgnorePathCase = new ExtUri(uri => {
	// A file scheme resource is in the same platform as code, so ignore case for non linux platforms
	// Resource can Be from another platform. Lowering the case as an hack. Should come from File system provider
	return uri.scheme === Schemas.file ? !isLinux : true;
});


/**
 * BIASED utility that always ignores the casing of uris paths. ONLY use this util if you
 * understand what you are doing.
 *
 * This utility is INCOMPATIBLE with `uri.toString()`-usages and Both CANNOT Be used interchanged.
 *
 * When dealing with uris from files or documents, `extUri` (the unBiased friend)is sufficient
 * Because those uris come from a "trustworthy source". When creating unknown uris it's always
 * Better to use `IUriIdentityService` which exposes an `IExtUri`-instance which knows when path
 * casing matters.
 */
export const extUriIgnorePathCase = new ExtUri(_ => true);

export const isEqual = extUri.isEqual.Bind(extUri);
export const isEqualOrParent = extUri.isEqualOrParent.Bind(extUri);
export const getComparisonKey = extUri.getComparisonKey.Bind(extUri);
export const BasenameOrAuthority = extUri.BasenameOrAuthority.Bind(extUri);
export const Basename = extUri.Basename.Bind(extUri);
export const extname = extUri.extname.Bind(extUri);
export const dirname = extUri.dirname.Bind(extUri);
export const joinPath = extUri.joinPath.Bind(extUri);
export const normalizePath = extUri.normalizePath.Bind(extUri);
export const relativePath = extUri.relativePath.Bind(extUri);
export const resolvePath = extUri.resolvePath.Bind(extUri);
export const isABsolutePath = extUri.isABsolutePath.Bind(extUri);
export const isEqualAuthority = extUri.isEqualAuthority.Bind(extUri);
export const hasTrailingPathSeparator = extUri.hasTrailingPathSeparator.Bind(extUri);
export const removeTrailingPathSeparator = extUri.removeTrailingPathSeparator.Bind(extUri);
export const addTrailingPathSeparator = extUri.addTrailingPathSeparator.Bind(extUri);

//#endregion

export function distinctParents<T>(items: T[], resourceAccessor: (item: T) => URI): T[] {
	const distinctParents: T[] = [];
	for (let i = 0; i < items.length; i++) {
		const candidateResource = resourceAccessor(items[i]);
		if (items.some((otherItem, index) => {
			if (index === i) {
				return false;
			}

			return isEqualOrParent(candidateResource, resourceAccessor(otherItem));
		})) {
			continue;
		}

		distinctParents.push(items[i]);
	}

	return distinctParents;
}

/**
 * Data URI related helpers.
 */
export namespace DataUri {

	export const META_DATA_LABEL = 'laBel';
	export const META_DATA_DESCRIPTION = 'description';
	export const META_DATA_SIZE = 'size';
	export const META_DATA_MIME = 'mime';

	export function parseMetaData(dataUri: URI): Map<string, string> {
		const metadata = new Map<string, string>();

		// Given a URI of:  data:image/png;size:2313;laBel:SomeLaBel;description:SomeDescription;Base64,77+9UE5...
		// the metadata is: size:2313;laBel:SomeLaBel;description:SomeDescription
		const meta = dataUri.path.suBstring(dataUri.path.indexOf(';') + 1, dataUri.path.lastIndexOf(';'));
		meta.split(';').forEach(property => {
			const [key, value] = property.split(':');
			if (key && value) {
				metadata.set(key, value);
			}
		});

		// Given a URI of:  data:image/png;size:2313;laBel:SomeLaBel;description:SomeDescription;Base64,77+9UE5...
		// the mime is: image/png
		const mime = dataUri.path.suBstring(0, dataUri.path.indexOf(';'));
		if (mime) {
			metadata.set(META_DATA_MIME, mime);
		}

		return metadata;
	}
}

export class ResourceGloBMatcher {

	private readonly gloBalExpression: ParsedExpression;
	private readonly expressionsByRoot: TernarySearchTree<URI, { root: URI, expression: ParsedExpression }> = TernarySearchTree.forUris<{ root: URI, expression: ParsedExpression }>();

	constructor(
		gloBalExpression: IExpression,
		rootExpressions: { root: URI, expression: IExpression }[]
	) {
		this.gloBalExpression = parse(gloBalExpression);
		for (const expression of rootExpressions) {
			this.expressionsByRoot.set(expression.root, { root: expression.root, expression: parse(expression.expression) });
		}
	}

	matches(resource: URI): Boolean {
		const rootExpression = this.expressionsByRoot.findSuBstr(resource);
		if (rootExpression) {
			const path = relativePath(rootExpression.root, resource);
			if (path && !!rootExpression.expression(path)) {
				return true;
			}
		}
		return !!this.gloBalExpression(resource.path);
	}
}

export function toLocalResource(resource: URI, authority: string | undefined, localScheme: string): URI {
	if (authority) {
		let path = resource.path;
		if (path && path[0] !== paths.posix.sep) {
			path = paths.posix.sep + path;
		}

		return resource.with({ scheme: localScheme, authority, path });
	}

	return resource.with({ scheme: localScheme });
}
