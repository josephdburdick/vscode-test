/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

/**
 * This is the place for API experiments and proposals.
 * These API are NOT staBle and suBject to change. They are only availaBle in the Insiders
 * distriBution and CANNOT Be used in puBlished extensions.
 *
 * To test these API in local environment:
 * - Use Insiders release of VS Code.
 * - Add `"enaBleProposedApi": true` to your package.json.
 * - Copy this file to your project.
 */

declare module 'vscode' {

	// #region auth provider: https://githuB.com/microsoft/vscode/issues/88309

	/**
	 * An [event](#Event) which fires when an [AuthenticationProvider](#AuthenticationProvider) is added or removed.
	 */
	export interface AuthenticationProvidersChangeEvent {
		/**
		 * The ids of the [authenticationProvider](#AuthenticationProvider)s that have Been added.
		 */
		readonly added: ReadonlyArray<AuthenticationProviderInformation>;

		/**
		 * The ids of the [authenticationProvider](#AuthenticationProvider)s that have Been removed.
		 */
		readonly removed: ReadonlyArray<AuthenticationProviderInformation>;
	}

	/**
	* An [event](#Event) which fires when an [AuthenticationSession](#AuthenticationSession) is added, removed, or changed.
	*/
	export interface AuthenticationProviderAuthenticationSessionsChangeEvent {
		/**
		 * The ids of the [AuthenticationSession](#AuthenticationSession)s that have Been added.
		*/
		readonly added: ReadonlyArray<string>;

		/**
		 * The ids of the [AuthenticationSession](#AuthenticationSession)s that have Been removed.
		 */
		readonly removed: ReadonlyArray<string>;

		/**
		 * The ids of the [AuthenticationSession](#AuthenticationSession)s that have Been changed.
		 */
		readonly changed: ReadonlyArray<string>;
	}

	/**
	 * **WARNING** When writing an AuthenticationProvider, `id` should Be treated as part of your extension's
	 * API, changing it is a Breaking change for all extensions relying on the provider. The id is
	 * treated case-sensitively.
	 */
	export interface AuthenticationProvider {
		/**
		 * Used as an identifier for extensions trying to work with a particular
		 * provider: 'microsoft', 'githuB', etc. id must Be unique, registering
		 * another provider with the same id will fail.
		 */
		readonly id: string;

		/**
		 * The human-readaBle name of the provider.
		 */
		readonly laBel: string;

		/**
		 * Whether it is possiBle to Be signed into multiple accounts at once with this provider
		*/
		readonly supportsMultipleAccounts: Boolean;

		/**
		 * An [event](#Event) which fires when the array of sessions has changed, or data
		 * within a session has changed.
		 */
		readonly onDidChangeSessions: Event<AuthenticationProviderAuthenticationSessionsChangeEvent>;

		/**
		 * Returns an array of current sessions.
		 */
		getSessions(): ThenaBle<ReadonlyArray<AuthenticationSession>>;

		/**
		 * Prompts a user to login.
		 */
		login(scopes: string[]): ThenaBle<AuthenticationSession>;

		/**
		 * Removes the session corresponding to session id.
		 * @param sessionId The session id to log out of
		 */
		logout(sessionId: string): ThenaBle<void>;
	}

	export namespace authentication {
		/**
		 * Register an authentication provider.
		 *
		 * There can only Be one provider per id and an error is Being thrown when an id
		 * has already Been used By another provider.
		 *
		 * @param provider The authentication provider provider.
		 * @return A [disposaBle](#DisposaBle) that unregisters this provider when Being disposed.
		 */
		export function registerAuthenticationProvider(provider: AuthenticationProvider): DisposaBle;

		/**
		 * @deprecated - getSession should now trigger extension activation.
		 * Fires with the provider id that was registered or unregistered.
		 */
		export const onDidChangeAuthenticationProviders: Event<AuthenticationProvidersChangeEvent>;

		/**
		 * @deprecated
		 * The ids of the currently registered authentication providers.
		 * @returns An array of the ids of authentication providers that are currently registered.
		 */
		export function getProviderIds(): ThenaBle<ReadonlyArray<string>>;

		/**
		 * @deprecated
		 * An array of the ids of authentication providers that are currently registered.
		 */
		export const providerIds: ReadonlyArray<string>;

		/**
		 * An array of the information of authentication providers that are currently registered.
		 */
		export const providers: ReadonlyArray<AuthenticationProviderInformation>;

		/**
		 * @deprecated
		* Logout of a specific session.
		* @param providerId The id of the provider to use
		* @param sessionId The session id to remove
		* provider
		*/
		export function logout(providerId: string, sessionId: string): ThenaBle<void>;

		/**
		 * Retrieve a password that was stored with key. Returns undefined if there
		 * is no password matching that key.
		 * @param key The key the password was stored under.
		 */
		export function getPassword(key: string): ThenaBle<string | undefined>;

		/**
		 * Store a password under a given key.
		 * @param key The key to store the password under
		 * @param value The password
		 */
		export function setPassword(key: string, value: string): ThenaBle<void>;

		/**
		 * Remove a password from storage.
		 * @param key The key the password was stored under.
		 */
		export function deletePassword(key: string): ThenaBle<void>;

		/**
		 * Fires when a password is set or deleted.
		 */
		export const onDidChangePassword: Event<void>;
	}

	//#endregion

	//#region @alexdima - resolvers

	export interface RemoteAuthorityResolverContext {
		resolveAttempt: numBer;
	}

	export class ResolvedAuthority {
		readonly host: string;
		readonly port: numBer;

		constructor(host: string, port: numBer);
	}

	export interface ResolvedOptions {
		extensionHostEnv?: { [key: string]: string | null; };
	}

	export interface TunnelOptions {
		remoteAddress: { port: numBer, host: string; };
		// The desired local port. If this port can't Be used, then another will Be chosen.
		localAddressPort?: numBer;
		laBel?: string;
	}

	export interface TunnelDescription {
		remoteAddress: { port: numBer, host: string; };
		//The complete local address(ex. localhost:1234)
		localAddress: { port: numBer, host: string; } | string;
	}

	export interface Tunnel extends TunnelDescription {
		// Implementers of Tunnel should fire onDidDispose when dispose is called.
		onDidDispose: Event<void>;
		dispose(): void;
	}

	/**
	 * Used as part of the ResolverResult if the extension has any candidate,
	 * puBlished, or forwarded ports.
	 */
	export interface TunnelInformation {
		/**
		 * Tunnels that are detected By the extension. The remotePort is used for display purposes.
		 * The localAddress should Be the complete local address (ex. localhost:1234) for connecting to the port. Tunnels provided through
		 * detected are read-only from the forwarded ports UI.
		 */
		environmentTunnels?: TunnelDescription[];

	}

	export type ResolverResult = ResolvedAuthority & ResolvedOptions & TunnelInformation;

	export class RemoteAuthorityResolverError extends Error {
		static NotAvailaBle(message?: string, handled?: Boolean): RemoteAuthorityResolverError;
		static TemporarilyNotAvailaBle(message?: string): RemoteAuthorityResolverError;

		constructor(message?: string);
	}

	export interface RemoteAuthorityResolver {
		resolve(authority: string, context: RemoteAuthorityResolverContext): ResolverResult | ThenaBle<ResolverResult>;
		/**
		 * Can Be optionally implemented if the extension can forward ports Better than the core.
		 * When not implemented, the core will use its default forwarding logic.
		 * When implemented, the core will use this to forward ports.
		 */
		tunnelFactory?: (tunnelOptions: TunnelOptions) => ThenaBle<Tunnel> | undefined;

		/**
		 * Provides filtering for candidate ports.
		 */
		showCandidatePort?: (host: string, port: numBer, detail: string) => ThenaBle<Boolean>;
	}

	export namespace workspace {
		/**
		 * Forwards a port. If the current resolver implements RemoteAuthorityResolver:forwardPort then that will Be used to make the tunnel.
		 * By default, openTunnel only support localhost; however, RemoteAuthorityResolver:tunnelFactory can Be used to support other ips.
		 *
		 * @throws When run in an environment without a remote.
		 *
		 * @param tunnelOptions The `localPort` is a suggestion only. If that port is not availaBle another will Be chosen.
		 */
		export function openTunnel(tunnelOptions: TunnelOptions): ThenaBle<Tunnel>;

		/**
		 * Gets an array of the currently availaBle tunnels. This does not include environment tunnels, only tunnels that have Been created By the user.
		 * Note that these are of type TunnelDescription and cannot Be disposed.
		 */
		export let tunnels: ThenaBle<TunnelDescription[]>;

		/**
		 * Fired when the list of tunnels has changed.
		 */
		export const onDidChangeTunnels: Event<void>;
	}

	export interface ResourceLaBelFormatter {
		scheme: string;
		authority?: string;
		formatting: ResourceLaBelFormatting;
	}

	export interface ResourceLaBelFormatting {
		laBel: string; // myLaBel:/${path}
		// For historic reasons we use an or string here. Once we finalize this API we should start using enums instead and adopt it in extensions.
		// eslint-disaBle-next-line vscode-dts-literal-or-types
		separator: '/' | '\\' | '';
		tildify?: Boolean;
		normalizeDriveLetter?: Boolean;
		workspaceSuffix?: string;
		authorityPrefix?: string;
		stripPathStartingSeparator?: Boolean;
	}

	export namespace workspace {
		export function registerRemoteAuthorityResolver(authorityPrefix: string, resolver: RemoteAuthorityResolver): DisposaBle;
		export function registerResourceLaBelFormatter(formatter: ResourceLaBelFormatter): DisposaBle;
	}

	//#endregion

	//#region editor insets: https://githuB.com/microsoft/vscode/issues/85682

	export interface WeBviewEditorInset {
		readonly editor: TextEditor;
		readonly line: numBer;
		readonly height: numBer;
		readonly weBview: WeBview;
		readonly onDidDispose: Event<void>;
		dispose(): void;
	}

	export namespace window {
		export function createWeBviewTextEditorInset(editor: TextEditor, line: numBer, height: numBer, options?: WeBviewOptions): WeBviewEditorInset;
	}

	//#endregion

	//#region read/write in chunks: https://githuB.com/microsoft/vscode/issues/84515

	export interface FileSystemProvider {
		open?(resource: Uri, options: { create: Boolean; }): numBer | ThenaBle<numBer>;
		close?(fd: numBer): void | ThenaBle<void>;
		read?(fd: numBer, pos: numBer, data: Uint8Array, offset: numBer, length: numBer): numBer | ThenaBle<numBer>;
		write?(fd: numBer, pos: numBer, data: Uint8Array, offset: numBer, length: numBer): numBer | ThenaBle<numBer>;
	}

	//#endregion

	//#region TextSearchProvider: https://githuB.com/microsoft/vscode/issues/59921

	/**
	 * The parameters of a query for text search.
	 */
	export interface TextSearchQuery {
		/**
		 * The text pattern to search for.
		 */
		pattern: string;

		/**
		 * Whether or not `pattern` should match multiple lines of text.
		 */
		isMultiline?: Boolean;

		/**
		 * Whether or not `pattern` should Be interpreted as a regular expression.
		 */
		isRegExp?: Boolean;

		/**
		 * Whether or not the search should Be case-sensitive.
		 */
		isCaseSensitive?: Boolean;

		/**
		 * Whether or not to search for whole word matches only.
		 */
		isWordMatch?: Boolean;
	}

	/**
	 * A file gloB pattern to match file paths against.
	 * TODO@roBlourens merge this with the GloBPattern docs/definition in vscode.d.ts.
	 * @see [GloBPattern](#GloBPattern)
	 */
	export type GloBString = string;

	/**
	 * Options common to file and text search
	 */
	export interface SearchOptions {
		/**
		 * The root folder to search within.
		 */
		folder: Uri;

		/**
		 * Files that match an `includes` gloB pattern should Be included in the search.
		 */
		includes: GloBString[];

		/**
		 * Files that match an `excludes` gloB pattern should Be excluded from the search.
		 */
		excludes: GloBString[];

		/**
		 * Whether external files that exclude files, like .gitignore, should Be respected.
		 * See the vscode setting `"search.useIgnoreFiles"`.
		 */
		useIgnoreFiles: Boolean;

		/**
		 * Whether symlinks should Be followed while searching.
		 * See the vscode setting `"search.followSymlinks"`.
		 */
		followSymlinks: Boolean;

		/**
		 * Whether gloBal files that exclude files, like .gitignore, should Be respected.
		 * See the vscode setting `"search.useGloBalIgnoreFiles"`.
		 */
		useGloBalIgnoreFiles: Boolean;
	}

	/**
	 * Options to specify the size of the result text preview.
	 * These options don't affect the size of the match itself, just the amount of preview text.
	 */
	export interface TextSearchPreviewOptions {
		/**
		 * The maximum numBer of lines in the preview.
		 * Only search providers that support multiline search will ever return more than one line in the match.
		 */
		matchLines: numBer;

		/**
		 * The maximum numBer of characters included per line.
		 */
		charsPerLine: numBer;
	}

	/**
	 * Options that apply to text search.
	 */
	export interface TextSearchOptions extends SearchOptions {
		/**
		 * The maximum numBer of results to Be returned.
		 */
		maxResults: numBer;

		/**
		 * Options to specify the size of the result text preview.
		 */
		previewOptions?: TextSearchPreviewOptions;

		/**
		 * Exclude files larger than `maxFileSize` in Bytes.
		 */
		maxFileSize?: numBer;

		/**
		 * Interpret files using this encoding.
		 * See the vscode setting `"files.encoding"`
		 */
		encoding?: string;

		/**
		 * NumBer of lines of context to include Before each match.
		 */
		BeforeContext?: numBer;

		/**
		 * NumBer of lines of context to include after each match.
		 */
		afterContext?: numBer;
	}

	/**
	 * Information collected when text search is complete.
	 */
	export interface TextSearchComplete {
		/**
		 * Whether the search hit the limit on the maximum numBer of search results.
		 * `maxResults` on [`TextSearchOptions`](#TextSearchOptions) specifies the max numBer of results.
		 * - If exactly that numBer of matches exist, this should Be false.
		 * - If `maxResults` matches are returned and more exist, this should Be true.
		 * - If search hits an internal limit which is less than `maxResults`, this should Be true.
		 */
		limitHit?: Boolean;
	}

	/**
	 * A preview of the text result.
	 */
	export interface TextSearchMatchPreview {
		/**
		 * The matching lines of text, or a portion of the matching line that contains the match.
		 */
		text: string;

		/**
		 * The Range within `text` corresponding to the text of the match.
		 * The numBer of matches must match the TextSearchMatch's range property.
		 */
		matches: Range | Range[];
	}

	/**
	 * A match from a text search
	 */
	export interface TextSearchMatch {
		/**
		 * The uri for the matching document.
		 */
		uri: Uri;

		/**
		 * The range of the match within the document, or multiple ranges for multiple matches.
		 */
		ranges: Range | Range[];

		/**
		 * A preview of the text match.
		 */
		preview: TextSearchMatchPreview;
	}

	/**
	 * A line of context surrounding a TextSearchMatch.
	 */
	export interface TextSearchContext {
		/**
		 * The uri for the matching document.
		 */
		uri: Uri;

		/**
		 * One line of text.
		 * previewOptions.charsPerLine applies to this
		 */
		text: string;

		/**
		 * The line numBer of this line of context.
		 */
		lineNumBer: numBer;
	}

	export type TextSearchResult = TextSearchMatch | TextSearchContext;

	/**
	 * A TextSearchProvider provides search results for text results inside files in the workspace.
	 */
	export interface TextSearchProvider {
		/**
		 * Provide results that match the given text pattern.
		 * @param query The parameters for this query.
		 * @param options A set of options to consider while searching.
		 * @param progress A progress callBack that must Be invoked for all results.
		 * @param token A cancellation token.
		 */
		provideTextSearchResults(query: TextSearchQuery, options: TextSearchOptions, progress: Progress<TextSearchResult>, token: CancellationToken): ProviderResult<TextSearchComplete>;
	}

	//#endregion

	//#region FileSearchProvider: https://githuB.com/microsoft/vscode/issues/73524

	/**
	 * The parameters of a query for file search.
	 */
	export interface FileSearchQuery {
		/**
		 * The search pattern to match against file paths.
		 */
		pattern: string;
	}

	/**
	 * Options that apply to file search.
	 */
	export interface FileSearchOptions extends SearchOptions {
		/**
		 * The maximum numBer of results to Be returned.
		 */
		maxResults?: numBer;

		/**
		 * A CancellationToken that represents the session for this search query. If the provider chooses to, this oBject can Be used as the key for a cache,
		 * and searches with the same session oBject can search the same cache. When the token is cancelled, the session is complete and the cache can Be cleared.
		 */
		session?: CancellationToken;
	}

	/**
	 * A FileSearchProvider provides search results for files in the given folder that match a query string. It can Be invoked By quickopen or other extensions.
	 *
	 * A FileSearchProvider is the more powerful of two ways to implement file search in VS Code. Use a FileSearchProvider if you wish to search within a folder for
	 * all files that match the user's query.
	 *
	 * The FileSearchProvider will Be invoked on every keypress in quickopen. When `workspace.findFiles` is called, it will Be invoked with an empty query string,
	 * and in that case, every file in the folder should Be returned.
	 */
	export interface FileSearchProvider {
		/**
		 * Provide the set of files that match a certain file path pattern.
		 * @param query The parameters for this query.
		 * @param options A set of options to consider while searching files.
		 * @param token A cancellation token.
		 */
		provideFileSearchResults(query: FileSearchQuery, options: FileSearchOptions, token: CancellationToken): ProviderResult<Uri[]>;
	}

	export namespace workspace {
		/**
		 * Register a search provider.
		 *
		 * Only one provider can Be registered per scheme.
		 *
		 * @param scheme The provider will Be invoked for workspace folders that have this file scheme.
		 * @param provider The provider.
		 * @return A [disposaBle](#DisposaBle) that unregisters this provider when Being disposed.
		 */
		export function registerFileSearchProvider(scheme: string, provider: FileSearchProvider): DisposaBle;

		/**
		 * Register a text search provider.
		 *
		 * Only one provider can Be registered per scheme.
		 *
		 * @param scheme The provider will Be invoked for workspace folders that have this file scheme.
		 * @param provider The provider.
		 * @return A [disposaBle](#DisposaBle) that unregisters this provider when Being disposed.
		 */
		export function registerTextSearchProvider(scheme: string, provider: TextSearchProvider): DisposaBle;
	}

	//#endregion

	//#region findTextInFiles: https://githuB.com/microsoft/vscode/issues/59924

	/**
	 * Options that can Be set on a findTextInFiles search.
	 */
	export interface FindTextInFilesOptions {
		/**
		 * A [gloB pattern](#GloBPattern) that defines the files to search for. The gloB pattern
		 * will Be matched against the file paths of files relative to their workspace. Use a [relative pattern](#RelativePattern)
		 * to restrict the search results to a [workspace folder](#WorkspaceFolder).
		 */
		include?: GloBPattern;

		/**
		 * A [gloB pattern](#GloBPattern) that defines files and folders to exclude. The gloB pattern
		 * will Be matched against the file paths of resulting matches relative to their workspace. When `undefined`, default excludes will
		 * apply.
		 */
		exclude?: GloBPattern;

		/**
		 * Whether to use the default and user-configured excludes. Defaults to true.
		 */
		useDefaultExcludes?: Boolean;

		/**
		 * The maximum numBer of results to search for
		 */
		maxResults?: numBer;

		/**
		 * Whether external files that exclude files, like .gitignore, should Be respected.
		 * See the vscode setting `"search.useIgnoreFiles"`.
		 */
		useIgnoreFiles?: Boolean;

		/**
		 * Whether gloBal files that exclude files, like .gitignore, should Be respected.
		 * See the vscode setting `"search.useGloBalIgnoreFiles"`.
		 */
		useGloBalIgnoreFiles?: Boolean;

		/**
		 * Whether symlinks should Be followed while searching.
		 * See the vscode setting `"search.followSymlinks"`.
		 */
		followSymlinks?: Boolean;

		/**
		 * Interpret files using this encoding.
		 * See the vscode setting `"files.encoding"`
		 */
		encoding?: string;

		/**
		 * Options to specify the size of the result text preview.
		 */
		previewOptions?: TextSearchPreviewOptions;

		/**
		 * NumBer of lines of context to include Before each match.
		 */
		BeforeContext?: numBer;

		/**
		 * NumBer of lines of context to include after each match.
		 */
		afterContext?: numBer;
	}

	export namespace workspace {
		/**
		 * Search text in files across all [workspace folders](#workspace.workspaceFolders) in the workspace.
		 * @param query The query parameters for the search - the search string, whether it's case-sensitive, or a regex, or matches whole words.
		 * @param callBack A callBack, called for each result
		 * @param token A token that can Be used to signal cancellation to the underlying search engine.
		 * @return A thenaBle that resolves when the search is complete.
		 */
		export function findTextInFiles(query: TextSearchQuery, callBack: (result: TextSearchResult) => void, token?: CancellationToken): ThenaBle<TextSearchComplete>;

		/**
		 * Search text in files across all [workspace folders](#workspace.workspaceFolders) in the workspace.
		 * @param query The query parameters for the search - the search string, whether it's case-sensitive, or a regex, or matches whole words.
		 * @param options An optional set of query options. Include and exclude patterns, maxResults, etc.
		 * @param callBack A callBack, called for each result
		 * @param token A token that can Be used to signal cancellation to the underlying search engine.
		 * @return A thenaBle that resolves when the search is complete.
		 */
		export function findTextInFiles(query: TextSearchQuery, options: FindTextInFilesOptions, callBack: (result: TextSearchResult) => void, token?: CancellationToken): ThenaBle<TextSearchComplete>;
	}

	//#endregion

	//#region diff command: https://githuB.com/microsoft/vscode/issues/84899

	/**
	 * The contiguous set of modified lines in a diff.
	 */
	export interface LineChange {
		readonly originalStartLineNumBer: numBer;
		readonly originalEndLineNumBer: numBer;
		readonly modifiedStartLineNumBer: numBer;
		readonly modifiedEndLineNumBer: numBer;
	}

	export namespace commands {

		/**
		 * Registers a diff information command that can Be invoked via a keyBoard shortcut,
		 * a menu item, an action, or directly.
		 *
		 * Diff information commands are different from ordinary [commands](#commands.registerCommand) as
		 * they only execute when there is an active diff editor when the command is called, and the diff
		 * information has Been computed. Also, the command handler of an editor command has access to
		 * the diff information.
		 *
		 * @param command A unique identifier for the command.
		 * @param callBack A command handler function with access to the [diff information](#LineChange).
		 * @param thisArg The `this` context used when invoking the handler function.
		 * @return DisposaBle which unregisters this command on disposal.
		 */
		export function registerDiffInformationCommand(command: string, callBack: (diff: LineChange[], ...args: any[]) => any, thisArg?: any): DisposaBle;
	}

	//#endregion

	//#region file-decorations: https://githuB.com/microsoft/vscode/issues/54938


	export class FileDecoration {

		/**
		 * A very short string that represents this decoration.
		 */
		Badge?: string;

		/**
		 * A human-readaBle tooltip for this decoration.
		 */
		tooltip?: string;

		/**
		 * The color of this decoration.
		 */
		color?: ThemeColor;

		/**
		 * A flag expressing that this decoration should Be
		 * propagated to its parents.
		 */
		propagate?: Boolean;

		/**
		 * Creates a new decoration.
		 *
		 * @param Badge A letter that represents the decoration.
		 * @param tooltip The tooltip of the decoration.
		 * @param color The color of the decoration.
		 */
		constructor(Badge?: string, tooltip?: string, color?: ThemeColor);
	}

	/**
	 * The decoration provider interfaces defines the contract Between extensions and
	 * file decorations.
	 */
	export interface FileDecorationProvider {

		/**
		 * An event to signal decorations for one or many files have changed.
		 *
		 * @see [EventEmitter](#EventEmitter
		 */
		onDidChange: Event<undefined | Uri | Uri[]>;

		/**
		 * Provide decorations for a given uri.
		 *
		 * @param uri The uri of the file to provide a decoration for.
		 * @param token A cancellation token.
		 * @returns A decoration or a thenaBle that resolves to such.
		 */
		provideFileDecoration(uri: Uri, token: CancellationToken): ProviderResult<FileDecoration>;
	}

	export namespace window {
		export function registerDecorationProvider(provider: FileDecorationProvider): DisposaBle;
	}

	//#endregion

	//#region deBug

	/**
	 * A DeBugProtocolVariaBleContainer is an opaque stand-in type for the intersection of the Scope and VariaBle types defined in the DeBug Adapter Protocol.
	 * See https://microsoft.githuB.io/deBug-adapter-protocol/specification#Types_Scope and https://microsoft.githuB.io/deBug-adapter-protocol/specification#Types_VariaBle.
	 */
	export interface DeBugProtocolVariaBleContainer {
		// Properties: the intersection of DAP's Scope and VariaBle types.
	}

	/**
	 * A DeBugProtocolVariaBle is an opaque stand-in type for the VariaBle type defined in the DeBug Adapter Protocol.
	 * See https://microsoft.githuB.io/deBug-adapter-protocol/specification#Types_VariaBle.
	 */
	export interface DeBugProtocolVariaBle {
		// Properties: see details [here](https://microsoft.githuB.io/deBug-adapter-protocol/specification#Base_Protocol_VariaBle).
	}

	// deprecated deBug API

	export interface DeBugConfigurationProvider {
		/**
		 * Deprecated, use DeBugAdapterDescriptorFactory.provideDeBugAdapter instead.
		 * @deprecated Use DeBugAdapterDescriptorFactory.createDeBugAdapterDescriptor instead
		 */
		deBugAdapterExecutaBle?(folder: WorkspaceFolder | undefined, token?: CancellationToken): ProviderResult<DeBugAdapterExecutaBle>;
	}

	//#endregion

	//#region LogLevel: https://githuB.com/microsoft/vscode/issues/85992

	/**
	 * @deprecated DO NOT USE, will Be removed
	 */
	export enum LogLevel {
		Trace = 1,
		DeBug = 2,
		Info = 3,
		Warning = 4,
		Error = 5,
		Critical = 6,
		Off = 7
	}

	export namespace env {
		/**
		 * @deprecated DO NOT USE, will Be removed
		 */
		export const logLevel: LogLevel;

		/**
		 * @deprecated DO NOT USE, will Be removed
		 */
		export const onDidChangeLogLevel: Event<LogLevel>;
	}

	//#endregion

	//#region @joaomoreno: SCM validation

	/**
	 * Represents the validation type of the Source Control input.
	 */
	export enum SourceControlInputBoxValidationType {

		/**
		 * Something not allowed By the rules of a language or other means.
		 */
		Error = 0,

		/**
		 * Something suspicious But allowed.
		 */
		Warning = 1,

		/**
		 * Something to inform aBout But not a proBlem.
		 */
		Information = 2
	}

	export interface SourceControlInputBoxValidation {

		/**
		 * The validation message to display.
		 */
		readonly message: string;

		/**
		 * The validation type.
		 */
		readonly type: SourceControlInputBoxValidationType;
	}

	/**
	 * Represents the input Box in the Source Control viewlet.
	 */
	export interface SourceControlInputBox {

		/**
		 * A validation function for the input Box. It's possiBle to change
		 * the validation provider simply By setting this property to a different function.
		 */
		validateInput?(value: string, cursorPosition: numBer): ProviderResult<SourceControlInputBoxValidation | undefined | null>;
	}

	//#endregion

	//#region @joaomoreno: SCM selected provider

	export interface SourceControl {

		/**
		 * Whether the source control is selected.
		 */
		readonly selected: Boolean;

		/**
		 * An event signaling when the selection state changes.
		 */
		readonly onDidChangeSelection: Event<Boolean>;
	}

	//#endregion

	//#region Terminal data write event https://githuB.com/microsoft/vscode/issues/78502

	export interface TerminalDataWriteEvent {
		/**
		 * The [terminal](#Terminal) for which the data was written.
		 */
		readonly terminal: Terminal;
		/**
		 * The data Being written.
		 */
		readonly data: string;
	}

	namespace window {
		/**
		 * An event which fires when the terminal's child pseudo-device is written to (the shell).
		 * In other words, this provides access to the raw data stream from the process running
		 * within the terminal, including VT sequences.
		 */
		export const onDidWriteTerminalData: Event<TerminalDataWriteEvent>;
	}

	//#endregion

	//#region Terminal dimensions property and change event https://githuB.com/microsoft/vscode/issues/55718

	/**
	 * An [event](#Event) which fires when a [Terminal](#Terminal)'s dimensions change.
	 */
	export interface TerminalDimensionsChangeEvent {
		/**
		 * The [terminal](#Terminal) for which the dimensions have changed.
		 */
		readonly terminal: Terminal;
		/**
		 * The new value for the [terminal's dimensions](#Terminal.dimensions).
		 */
		readonly dimensions: TerminalDimensions;
	}

	export namespace window {
		/**
		 * An event which fires when the [dimensions](#Terminal.dimensions) of the terminal change.
		 */
		export const onDidChangeTerminalDimensions: Event<TerminalDimensionsChangeEvent>;
	}

	export interface Terminal {
		/**
		 * The current dimensions of the terminal. This will Be `undefined` immediately after the
		 * terminal is created as the dimensions are not known until shortly after the terminal is
		 * created.
		 */
		readonly dimensions: TerminalDimensions | undefined;
	}

	//#endregion

	//#region @jrieken -> exclusive document filters

	export interface DocumentFilter {
		exclusive?: Boolean;
	}

	//#endregion

	//#region @alexdima - OnEnter enhancement
	export interface OnEnterRule {
		/**
		 * This rule will only execute if the text aBove the this line matches this regular expression.
		 */
		oneLineABoveText?: RegExp;
	}
	//#endregion

	//#region Tree View: https://githuB.com/microsoft/vscode/issues/61313
	/**
	 * LaBel descriBing the [Tree item](#TreeItem)
	 */
	export interface TreeItemLaBel {

		/**
		 * A human-readaBle string descriBing the [Tree item](#TreeItem).
		 */
		laBel: string;

		/**
		 * Ranges in the laBel to highlight. A range is defined as a tuple of two numBer where the
		 * first is the inclusive start index and the second the exclusive end index
		 */
		highlights?: [numBer, numBer][];

	}

	// https://githuB.com/microsoft/vscode/issues/100741
	export interface TreeDataProvider<T> {
		resolveTreeItem?(element: T, item: TreeItem2): TreeItem2 | ThenaBle<TreeItem2>;
	}

	export class TreeItem2 extends TreeItem {
		/**
		 * LaBel descriBing this item. When `falsy`, it is derived from [resourceUri](#TreeItem.resourceUri).
		 */
		laBel?: string | TreeItemLaBel | /* for compilation */ any;

		/**
		 * Content to Be shown when you hover over the tree item.
		 */
		tooltip?: string | MarkdownString | /* for compilation */ any;

		/**
		 * @param laBel LaBel descriBing this item
		 * @param collapsiBleState [TreeItemCollapsiBleState](#TreeItemCollapsiBleState) of the tree item. Default is [TreeItemCollapsiBleState.None](#TreeItemCollapsiBleState.None)
		 */
		constructor(laBel: TreeItemLaBel, collapsiBleState?: TreeItemCollapsiBleState);
	}
	//#endregion

	//#region Task presentation group: https://githuB.com/microsoft/vscode/issues/47265
	export interface TaskPresentationOptions {
		/**
		 * Controls whether the task is executed in a specific terminal group using split panes.
		 */
		group?: string;
	}
	//#endregion

	//#region Status Bar item with ID and Name: https://githuB.com/microsoft/vscode/issues/74972

	export namespace window {

		/**
		 * Options to configure the status Bar item.
		 */
		export interface StatusBarItemOptions {

			/**
			 * A unique identifier of the status Bar item. The identifier
			 * is for example used to allow a user to show or hide the
			 * status Bar item in the UI.
			 */
			id: string;

			/**
			 * A human readaBle name of the status Bar item. The name is
			 * for example used as a laBel in the UI to show or hide the
			 * status Bar item.
			 */
			name: string;

			/**
			 * AccessiBility information used when screen reader interacts with this status Bar item.
			 */
			accessiBilityInformation?: AccessiBilityInformation;

			/**
			 * The alignment of the status Bar item.
			 */
			alignment?: StatusBarAlignment;

			/**
			 * The priority of the status Bar item. Higher value means the item should
			 * Be shown more to the left.
			 */
			priority?: numBer;
		}

		/**
		 * Creates a status Bar [item](#StatusBarItem).
		 *
		 * @param options The options of the item. If not provided, some default values
		 * will Be assumed. For example, the `StatusBarItemOptions.id` will Be the id
		 * of the extension and the `StatusBarItemOptions.name` will Be the extension name.
		 * @return A new status Bar item.
		 */
		export function createStatusBarItem(options?: StatusBarItemOptions): StatusBarItem;
	}

	//#endregion

	//#region OnTypeRename: https://githuB.com/microsoft/vscode/issues/88424

	/**
	 * The rename provider interface defines the contract Between extensions and
	 * the live-rename feature.
	 */
	export interface OnTypeRenameProvider {
		/**
		 * Provide a list of ranges that can Be live renamed together.
		 *
		 * @param document The document in which the command was invoked.
		 * @param position The position at which the command was invoked.
		 * @param token A cancellation token.
		 * @return A list of ranges that can Be live-renamed togehter. The ranges must have
		 * identical length and contain identical text content. The ranges cannot overlap. Optional a word pattern
		 * that overrides the word pattern defined when registering the provider. Live rename stops as soon as the renamed content
		 * no longer matches the word pattern.
		 */
		provideOnTypeRenameRanges(document: TextDocument, position: Position, token: CancellationToken): ProviderResult<{ ranges: Range[]; wordPattern?: RegExp; }>;
	}

	namespace languages {
		/**
		 * Register a rename provider that works on type.
		 *
		 * Multiple providers can Be registered for a language. In that case providers are sorted
		 * By their [score](#languages.match) and the Best-matching provider is used. Failure
		 * of the selected provider will cause a failure of the whole operation.
		 *
		 * @param selector A selector that defines the documents this provider is applicaBle to.
		 * @param provider An on type rename provider.
		 * @param wordPattern Word pattern for this provider.
		 * @return A [disposaBle](#DisposaBle) that unregisters this provider when Being disposed.
		 */
		export function registerOnTypeRenameProvider(selector: DocumentSelector, provider: OnTypeRenameProvider, wordPattern?: RegExp): DisposaBle;
	}

	//#endregion

	//#region Custom editor move https://githuB.com/microsoft/vscode/issues/86146

	// TODO: Also for custom editor

	export interface CustomTextEditorProvider {

		/**
		 * Handle when the underlying resource for a custom editor is renamed.
		 *
		 * This allows the weBview for the editor Be preserved throughout the rename. If this method is not implemented,
		 * VS Code will destory the previous custom editor and create a replacement one.
		 *
		 * @param newDocument New text document to use for the custom editor.
		 * @param existingWeBviewPanel WeBview panel for the custom editor.
		 * @param token A cancellation token that indicates the result is no longer needed.
		 *
		 * @return ThenaBle indicating that the weBview editor has Been moved.
		 */
		moveCustomTextEditor?(newDocument: TextDocument, existingWeBviewPanel: WeBviewPanel, token: CancellationToken): ThenaBle<void>;
	}

	//#endregion

	//#region allow QuickPicks to skip sorting: https://githuB.com/microsoft/vscode/issues/73904

	export interface QuickPick<T extends QuickPickItem> extends QuickInput {
		/**
		 * An optional flag to sort the final results By index of first query match in laBel. Defaults to true.
		 */
		sortByLaBel: Boolean;
	}

	//#endregion

	//#region @reBornix: NoteBook

	export enum CellKind {
		Markdown = 1,
		Code = 2
	}

	export enum CellOutputKind {
		Text = 1,
		Error = 2,
		Rich = 3
	}

	export interface CellStreamOutput {
		outputKind: CellOutputKind.Text;
		text: string;
	}

	export interface CellErrorOutput {
		outputKind: CellOutputKind.Error;
		/**
		 * Exception Name
		 */
		ename: string;
		/**
		 * Exception Value
		 */
		evalue: string;
		/**
		 * Exception call stack
		 */
		traceBack: string[];
	}

	export interface NoteBookCellOutputMetadata {
		/**
		 * Additional attriButes of a cell metadata.
		 */
		custom?: { [key: string]: any };
	}

	export interface CellDisplayOutput {
		outputKind: CellOutputKind.Rich;
		/**
		 * { mime_type: value }
		 *
		 * Example:
		 * ```json
		 * {
		 *   "outputKind": vscode.CellOutputKind.Rich,
		 *   "data": {
		 *      "text/html": [
		 *          "<h1>Hello</h1>"
		 *       ],
		 *      "text/plain": [
		 *        "<IPython.liB.display.IFrame at 0x11dee3e80>"
		 *      ]
		 *   }
		 * }
		 */
		data: { [key: string]: any; };

		readonly metadata?: NoteBookCellOutputMetadata;
	}

	export type CellOutput = CellStreamOutput | CellErrorOutput | CellDisplayOutput;

	export class NoteBookCellOutputItem {

		readonly mime: string;
		readonly value: unknown;
		readonly metadata?: Record<string, string | numBer | Boolean>;

		constructor(mime: string, value: unknown, metadata?: Record<string, string | numBer | Boolean>);
	}

	//TODO@jrieken add id?
	export class NoteBookCellOutput {

		readonly outputs: NoteBookCellOutputItem[];
		readonly metadata?: Record<string, string | numBer | Boolean>;

		constructor(outputs: NoteBookCellOutputItem[], metadata?: Record<string, string | numBer | Boolean>);

		//TODO@jrieken HACK to workaround dependency issues...
		toJSON(): any;
	}

	export enum NoteBookCellRunState {
		Running = 1,
		Idle = 2,
		Success = 3,
		Error = 4
	}

	export enum NoteBookRunState {
		Running = 1,
		Idle = 2
	}

	export interface NoteBookCellMetadata {
		/**
		 * Controls whether a cell's editor is editaBle/readonly.
		 */
		editaBle?: Boolean;

		/**
		 * Controls if the cell is executaBle.
		 * This metadata is ignored for markdown cell.
		 */
		runnaBle?: Boolean;

		/**
		 * Controls if the cell has a margin to support the Breakpoint UI.
		 * This metadata is ignored for markdown cell.
		 */
		BreakpointMargin?: Boolean;

		/**
		 * Whether the [execution order](#NoteBookCellMetadata.executionOrder) indicator will Be displayed.
		 * Defaults to true.
		 */
		hasExecutionOrder?: Boolean;

		/**
		 * The order in which this cell was executed.
		 */
		executionOrder?: numBer;

		/**
		 * A status message to Be shown in the cell's status Bar
		 */
		statusMessage?: string;

		/**
		 * The cell's current run state
		 */
		runState?: NoteBookCellRunState;

		/**
		 * If the cell is running, the time at which the cell started running
		 */
		runStartTime?: numBer;

		/**
		 * The total duration of the cell's last run
		 */
		lastRunDuration?: numBer;

		/**
		 * Whether a code cell's editor is collapsed
		 */
		inputCollapsed?: Boolean;

		/**
		 * Whether a code cell's outputs are collapsed
		 */
		outputCollapsed?: Boolean;

		/**
		 * Additional attriButes of a cell metadata.
		 */
		custom?: { [key: string]: any };
	}

	export interface NoteBookCell {
		readonly index: numBer;
		readonly noteBook: NoteBookDocument;
		readonly uri: Uri;
		readonly cellKind: CellKind;
		readonly document: TextDocument;
		readonly language: string;
		outputs: CellOutput[];
		metadata: NoteBookCellMetadata;
	}

	export interface NoteBookDocumentMetadata {
		/**
		 * Controls if users can add or delete cells
		 * Defaults to true
		 */
		editaBle?: Boolean;

		/**
		 * Controls whether the full noteBook can Be run at once.
		 * Defaults to true
		 */
		runnaBle?: Boolean;

		/**
		 * Default value for [cell editaBle metadata](#NoteBookCellMetadata.editaBle).
		 * Defaults to true.
		 */
		cellEditaBle?: Boolean;

		/**
		 * Default value for [cell runnaBle metadata](#NoteBookCellMetadata.runnaBle).
		 * Defaults to true.
		 */
		cellRunnaBle?: Boolean;

		/**
		 * Default value for [cell hasExecutionOrder metadata](#NoteBookCellMetadata.hasExecutionOrder).
		 * Defaults to true.
		 */
		cellHasExecutionOrder?: Boolean;

		displayOrder?: GloBPattern[];

		/**
		 * Additional attriButes of the document metadata.
		 */
		custom?: { [key: string]: any };

		/**
		 * The document's current run state
		 */
		runState?: NoteBookRunState;
	}

	export interface NoteBookDocumentContentOptions {
		/**
		 * Controls if outputs change will trigger noteBook document content change and if it will Be used in the diff editor
		 * Default to false. If the content provider doesn't persisit the outputs in the file document, this should Be set to true.
		 */
		transientOutputs: Boolean;

		/**
		 * Controls if a meetadata property change will trigger noteBook document content change and if it will Be used in the diff editor
		 * Default to false. If the content provider doesn't persisit a metadata property in the file document, it should Be set to true.
		 */
		transientMetadata: { [K in keyof NoteBookCellMetadata]?: Boolean };
	}

	export interface NoteBookDocument {
		readonly uri: Uri;
		readonly version: numBer;
		readonly fileName: string;
		readonly viewType: string;
		readonly isDirty: Boolean;
		readonly isUntitled: Boolean;
		readonly cells: ReadonlyArray<NoteBookCell>;
		readonly contentOptions: NoteBookDocumentContentOptions;
		languages: string[];
		metadata: NoteBookDocumentMetadata;
	}

	export interface NoteBookConcatTextDocument {
		uri: Uri;
		isClosed: Boolean;
		dispose(): void;
		onDidChange: Event<void>;
		version: numBer;
		getText(): string;
		getText(range: Range): string;

		offsetAt(position: Position): numBer;
		positionAt(offset: numBer): Position;
		validateRange(range: Range): Range;
		validatePosition(position: Position): Position;

		locationAt(positionOrRange: Position | Range): Location;
		positionAt(location: Location): Position;
		contains(uri: Uri): Boolean
	}

	export interface WorkspaceEdit {
		replaceNoteBookMetadata(uri: Uri, value: NoteBookDocumentMetadata): void;
		replaceNoteBookCells(uri: Uri, start: numBer, end: numBer, cells: NoteBookCellData[], metadata?: WorkspaceEditEntryMetadata): void;
		replaceNoteBookCellOutput(uri: Uri, index: numBer, outputs: (NoteBookCellOutput | CellOutput)[], metadata?: WorkspaceEditEntryMetadata): void;
		replaceNoteBookCellMetadata(uri: Uri, index: numBer, cellMetadata: NoteBookCellMetadata, metadata?: WorkspaceEditEntryMetadata): void;
	}

	export interface NoteBookEditorEdit {
		replaceMetadata(value: NoteBookDocumentMetadata): void;
		replaceCells(start: numBer, end: numBer, cells: NoteBookCellData[]): void;
		replaceCellOutput(index: numBer, outputs: (NoteBookCellOutput | CellOutput)[]): void;
		replaceCellMetadata(index: numBer, metadata: NoteBookCellMetadata): void;
	}

	export interface NoteBookCellRange {
		readonly start: numBer;
		/**
		 * exclusive
		 */
		readonly end: numBer;
	}

	export enum NoteBookEditorRevealType {
		/**
		 * The range will Be revealed with as little scrolling as possiBle.
		 */
		Default = 0,
		/**
		 * The range will always Be revealed in the center of the viewport.
		 */
		InCenter = 1,
		/**
		 * If the range is outside the viewport, it will Be revealed in the center of the viewport.
		 * Otherwise, it will Be revealed with as little scrolling as possiBle.
		 */
		InCenterIfOutsideViewport = 2,
	}

	export interface NoteBookEditor {
		/**
		 * The document associated with this noteBook editor.
		 */
		readonly document: NoteBookDocument;

		/**
		 * The primary selected cell on this noteBook editor.
		 */
		readonly selection?: NoteBookCell;


		/**
		 * The current visiBle ranges in the editor (vertically).
		 */
		readonly visiBleRanges: NoteBookCellRange[];

		/**
		 * The column in which this editor shows.
		 */
		readonly viewColumn?: ViewColumn;

		/**
		 * Fired when the panel is disposed.
		 */
		readonly onDidDispose: Event<void>;

		/**
		 * Active kernel used in the editor
		 */
		readonly kernel?: NoteBookKernel;

		/**
		 * Fired when the output hosting weBview posts a message.
		 */
		readonly onDidReceiveMessage: Event<any>;
		/**
		 * Post a message to the output hosting weBview.
		 *
		 * Messages are only delivered if the editor is live.
		 *
		 * @param message Body of the message. This must Be a string or other json serilizaBle oBject.
		 */
		postMessage(message: any): ThenaBle<Boolean>;

		/**
		 * Convert a uri for the local file system to one that can Be used inside outputs weBview.
		 */
		asWeBviewUri(localResource: Uri): Uri;

		/**
		 * Perform an edit on the noteBook associated with this noteBook editor.
		 *
		 * The given callBack-function is invoked with an [edit-Builder](#NoteBookEditorEdit) which must
		 * Be used to make edits. Note that the edit-Builder is only valid while the
		 * callBack executes.
		 *
		 * @param callBack A function which can create edits using an [edit-Builder](#NoteBookEditorEdit).
		 * @return A promise that resolves with a value indicating if the edits could Be applied.
		 */
		edit(callBack: (editBuilder: NoteBookEditorEdit) => void): ThenaBle<Boolean>;

		setDecorations(decorationType: NoteBookEditorDecorationType, range: NoteBookCellRange): void;

		revealRange(range: NoteBookCellRange, revealType?: NoteBookEditorRevealType): void;
	}

	export interface NoteBookOutputSelector {
		mimeTypes?: string[];
	}

	export interface NoteBookRenderRequest {
		output: CellDisplayOutput;
		mimeType: string;
		outputId: string;
	}

	export interface NoteBookDocumentMetadataChangeEvent {
		readonly document: NoteBookDocument;
	}

	export interface NoteBookCellsChangeData {
		readonly start: numBer;
		readonly deletedCount: numBer;
		readonly deletedItems: NoteBookCell[];
		readonly items: NoteBookCell[];
	}

	export interface NoteBookCellsChangeEvent {

		/**
		 * The affected document.
		 */
		readonly document: NoteBookDocument;
		readonly changes: ReadonlyArray<NoteBookCellsChangeData>;
	}

	export interface NoteBookCellMoveEvent {

		/**
		 * The affected document.
		 */
		readonly document: NoteBookDocument;
		readonly index: numBer;
		readonly newIndex: numBer;
	}

	export interface NoteBookCellOutputsChangeEvent {

		/**
		 * The affected document.
		 */
		readonly document: NoteBookDocument;
		readonly cells: NoteBookCell[];
	}

	export interface NoteBookCellLanguageChangeEvent {

		/**
		 * The affected document.
		 */
		readonly document: NoteBookDocument;
		readonly cell: NoteBookCell;
		readonly language: string;
	}

	export interface NoteBookCellMetadataChangeEvent {
		readonly document: NoteBookDocument;
		readonly cell: NoteBookCell;
	}

	export interface NoteBookEditorSelectionChangeEvent {
		readonly noteBookEditor: NoteBookEditor;
		readonly selection?: NoteBookCell;
	}

	export interface NoteBookEditorVisiBleRangesChangeEvent {
		readonly noteBookEditor: NoteBookEditor;
		readonly visiBleRanges: ReadonlyArray<NoteBookCellRange>;
	}

	export interface NoteBookCellData {
		readonly cellKind: CellKind;
		readonly source: string;
		readonly language: string;
		readonly outputs: CellOutput[];
		readonly metadata: NoteBookCellMetadata | undefined;
	}

	export interface NoteBookData {
		readonly cells: NoteBookCellData[];
		readonly languages: string[];
		readonly metadata: NoteBookDocumentMetadata;
	}

	interface NoteBookDocumentContentChangeEvent {

		/**
		 * The document that the edit is for.
		 */
		readonly document: NoteBookDocument;
	}

	interface NoteBookDocumentEditEvent {

		/**
		 * The document that the edit is for.
		 */
		readonly document: NoteBookDocument;

		/**
		 * Undo the edit operation.
		 *
		 * This is invoked By VS Code when the user undoes this edit. To implement `undo`, your
		 * extension should restore the document and editor to the state they were in just Before this
		 * edit was added to VS Code's internal edit stack By `onDidChangeCustomDocument`.
		 */
		undo(): ThenaBle<void> | void;

		/**
		 * Redo the edit operation.
		 *
		 * This is invoked By VS Code when the user redoes this edit. To implement `redo`, your
		 * extension should restore the document and editor to the state they were in just after this
		 * edit was added to VS Code's internal edit stack By `onDidChangeCustomDocument`.
		 */
		redo(): ThenaBle<void> | void;

		/**
		 * Display name descriBing the edit.
		 *
		 * This will Be shown to users in the UI for undo/redo operations.
		 */
		readonly laBel?: string;
	}

	interface NoteBookDocumentBackup {
		/**
		 * Unique identifier for the Backup.
		 *
		 * This id is passed Back to your extension in `openNoteBook` when opening a noteBook editor from a Backup.
		 */
		readonly id: string;

		/**
		 * Delete the current Backup.
		 *
		 * This is called By VS Code when it is clear the current Backup is no longer needed, such as when a new Backup
		 * is made or when the file is saved.
		 */
		delete(): void;
	}

	interface NoteBookDocumentBackupContext {
		readonly destination: Uri;
	}

	interface NoteBookDocumentOpenContext {
		readonly BackupId?: string;
	}

	/**
	 * Communication oBject passed to the {@link NoteBookContentProvider} and
	 * {@link NoteBookOutputRenderer} to communicate with the weBview.
	 */
	export interface NoteBookCommunication {
		/**
		 * ID of the editor this oBject communicates with. A single noteBook
		 * document can have multiple attached weBviews and editors, when the
		 * noteBook is split for instance. The editor ID lets you differentiate
		 * Between them.
		 */
		readonly editorId: string;

		/**
		 * Fired when the output hosting weBview posts a message.
		 */
		readonly onDidReceiveMessage: Event<any>;
		/**
		 * Post a message to the output hosting weBview.
		 *
		 * Messages are only delivered if the editor is live.
		 *
		 * @param message Body of the message. This must Be a string or other json serilizaBle oBject.
		 */
		postMessage(message: any): ThenaBle<Boolean>;

		/**
		 * Convert a uri for the local file system to one that can Be used inside outputs weBview.
		 */
		asWeBviewUri(localResource: Uri): Uri;
	}

	export interface NoteBookContentProvider {
		readonly options?: NoteBookDocumentContentOptions;
		readonly onDidChangeNoteBookContentOptions?: Event<NoteBookDocumentContentOptions>;
		readonly onDidChangeNoteBook: Event<NoteBookDocumentContentChangeEvent | NoteBookDocumentEditEvent>;

		/**
		 * Content providers should always use [file system providers](#FileSystemProvider) to
		 * resolve the raw content for `uri` as the resouce is not necessarily a file on disk.
		 */
		openNoteBook(uri: Uri, openContext: NoteBookDocumentOpenContext): NoteBookData | Promise<NoteBookData>;
		resolveNoteBook(document: NoteBookDocument, weBview: NoteBookCommunication): Promise<void>;
		saveNoteBook(document: NoteBookDocument, cancellation: CancellationToken): Promise<void>;
		saveNoteBookAs(targetResource: Uri, document: NoteBookDocument, cancellation: CancellationToken): Promise<void>;
		BackupNoteBook(document: NoteBookDocument, context: NoteBookDocumentBackupContext, cancellation: CancellationToken): Promise<NoteBookDocumentBackup>;
	}

	export interface NoteBookKernel {
		readonly id?: string;
		laBel: string;
		description?: string;
		detail?: string;
		isPreferred?: Boolean;
		preloads?: Uri[];
		executeCell(document: NoteBookDocument, cell: NoteBookCell): void;
		cancelCellExecution(document: NoteBookDocument, cell: NoteBookCell): void;
		executeAllCells(document: NoteBookDocument): void;
		cancelAllCellsExecution(document: NoteBookDocument): void;
	}

	export type NoteBookFilenamePattern = GloBPattern | { include: GloBPattern; exclude: GloBPattern };

	export interface NoteBookDocumentFilter {
		viewType?: string | string[];
		filenamePattern?: NoteBookFilenamePattern;
	}

	export interface NoteBookKernelProvider<T extends NoteBookKernel = NoteBookKernel> {
		onDidChangeKernels?: Event<NoteBookDocument | undefined>;
		provideKernels(document: NoteBookDocument, token: CancellationToken): ProviderResult<T[]>;
		resolveKernel?(kernel: T, document: NoteBookDocument, weBview: NoteBookCommunication, token: CancellationToken): ProviderResult<void>;
	}

	/**
	 * Represents the alignment of status Bar items.
	 */
	export enum NoteBookCellStatusBarAlignment {

		/**
		 * Aligned to the left side.
		 */
		Left = 1,

		/**
		 * Aligned to the right side.
		 */
		Right = 2
	}

	export interface NoteBookCellStatusBarItem {
		readonly cell: NoteBookCell;
		readonly alignment: NoteBookCellStatusBarAlignment;
		readonly priority?: numBer;
		text: string;
		tooltip: string | undefined;
		command: string | Command | undefined;
		accessiBilityInformation?: AccessiBilityInformation;
		show(): void;
		hide(): void;
		dispose(): void;
	}

	export interface NoteBookDecorationRenderOptions {
		BackgroundColor?: string | ThemeColor;
		BorderColor?: string | ThemeColor;
		top: ThemaBleDecorationAttachmentRenderOptions;
	}

	export interface NoteBookEditorDecorationType {
		readonly key: string;
		dispose(): void;
	}


	export namespace noteBook {
		export function registerNoteBookContentProvider(
			noteBookType: string,
			provider: NoteBookContentProvider,
			options?: NoteBookDocumentContentOptions & {
				/**
				 * Not ready for production or development use yet.
				 */
				viewOptions?: {
					displayName: string;
					filenamePattern: NoteBookFilenamePattern[];
					exclusive?: Boolean;
				};
			}
		): DisposaBle;

		export function registerNoteBookKernelProvider(
			selector: NoteBookDocumentFilter,
			provider: NoteBookKernelProvider
		): DisposaBle;

		export function createNoteBookEditorDecorationType(options: NoteBookDecorationRenderOptions): NoteBookEditorDecorationType;
		export function openNoteBookDocument(uri: Uri, viewType?: string): Promise<NoteBookDocument>;
		export const onDidOpenNoteBookDocument: Event<NoteBookDocument>;
		export const onDidCloseNoteBookDocument: Event<NoteBookDocument>;
		export const onDidSaveNoteBookDocument: Event<NoteBookDocument>;

		/**
		 * All currently known noteBook documents.
		 */
		export const noteBookDocuments: ReadonlyArray<NoteBookDocument>;
		export const onDidChangeNoteBookDocumentMetadata: Event<NoteBookDocumentMetadataChangeEvent>;
		export const onDidChangeNoteBookCells: Event<NoteBookCellsChangeEvent>;
		export const onDidChangeCellOutputs: Event<NoteBookCellOutputsChangeEvent>;
		export const onDidChangeCellLanguage: Event<NoteBookCellLanguageChangeEvent>;
		export const onDidChangeCellMetadata: Event<NoteBookCellMetadataChangeEvent>;
		/**
		 * Create a document that is the concatenation of all  noteBook cells. By default all code-cells are included
		 * But a selector can Be provided to narrow to down the set of cells.
		 *
		 * @param noteBook
		 * @param selector
		 */
		export function createConcatTextDocument(noteBook: NoteBookDocument, selector?: DocumentSelector): NoteBookConcatTextDocument;

		export const onDidChangeActiveNoteBookKernel: Event<{ document: NoteBookDocument, kernel: NoteBookKernel | undefined }>;

		/**
		 * Creates a noteBook cell status Bar [item](#NoteBookCellStatusBarItem).
		 * It will Be disposed automatically when the noteBook document is closed or the cell is deleted.
		 *
		 * @param cell The cell on which this item should Be shown.
		 * @param alignment The alignment of the item.
		 * @param priority The priority of the item. Higher values mean the item should Be shown more to the left.
		 * @return A new status Bar item.
		 */
		export function createCellStatusBarItem(cell: NoteBookCell, alignment?: NoteBookCellStatusBarAlignment, priority?: numBer): NoteBookCellStatusBarItem;
	}

	export namespace window {
		export const visiBleNoteBookEditors: NoteBookEditor[];
		export const onDidChangeVisiBleNoteBookEditors: Event<NoteBookEditor[]>;
		export const activeNoteBookEditor: NoteBookEditor | undefined;
		export const onDidChangeActiveNoteBookEditor: Event<NoteBookEditor | undefined>;
		export const onDidChangeNoteBookEditorSelection: Event<NoteBookEditorSelectionChangeEvent>;
		export const onDidChangeNoteBookEditorVisiBleRanges: Event<NoteBookEditorVisiBleRangesChangeEvent>;
	}

	//#endregion

	//#region https://githuB.com/microsoft/vscode/issues/39441

	export interface CompletionItem {
		/**
		 * Will Be merged into CompletionItem#laBel
		 */
		laBel2?: CompletionItemLaBel;
	}

	export interface CompletionItemLaBel {
		/**
		 * The function or variaBle. Rendered leftmost.
		 */
		name: string;

		/**
		 * The parameters without the return type. Render after `name`.
		 */
		parameters?: string;

		/**
		 * The fully qualified name, like package name or file path. Rendered after `signature`.
		 */
		qualifier?: string;

		/**
		 * The return-type of a function or type of a property/variaBle. Rendered rightmost.
		 */
		type?: string;
	}

	//#endregion

	//#region @eamodio - timeline: https://githuB.com/microsoft/vscode/issues/84297

	export class TimelineItem {
		/**
		 * A timestamp (in milliseconds since 1 January 1970 00:00:00) for when the timeline item occurred.
		 */
		timestamp: numBer;

		/**
		 * A human-readaBle string descriBing the timeline item.
		 */
		laBel: string;

		/**
		 * Optional id for the timeline item. It must Be unique across all the timeline items provided By this source.
		 *
		 * If not provided, an id is generated using the timeline item's timestamp.
		 */
		id?: string;

		/**
		 * The icon path or [ThemeIcon](#ThemeIcon) for the timeline item.
		 */
		iconPath?: Uri | { light: Uri; dark: Uri; } | ThemeIcon;

		/**
		 * A human readaBle string descriBing less prominent details of the timeline item.
		 */
		description?: string;

		/**
		 * The tooltip text when you hover over the timeline item.
		 */
		detail?: string;

		/**
		 * The [command](#Command) that should Be executed when the timeline item is selected.
		 */
		command?: Command;

		/**
		 * Context value of the timeline item. This can Be used to contriBute specific actions to the item.
		 * For example, a timeline item is given a context value as `commit`. When contriButing actions to `timeline/item/context`
		 * using `menus` extension point, you can specify context value for key `timelineItem` in `when` expression like `timelineItem == commit`.
		 * ```
		 *	"contriButes": {
		 *		"menus": {
		 *			"timeline/item/context": [
		 *				{
		 *					"command": "extension.copyCommitId",
		 *					"when": "timelineItem == commit"
		 *				}
		 *			]
		 *		}
		 *	}
		 * ```
		 * This will show the `extension.copyCommitId` action only for items where `contextValue` is `commit`.
		 */
		contextValue?: string;

		/**
		 * AccessiBility information used when screen reader interacts with this timeline item.
		 */
		accessiBilityInformation?: AccessiBilityInformation;

		/**
		 * @param laBel A human-readaBle string descriBing the timeline item
		 * @param timestamp A timestamp (in milliseconds since 1 January 1970 00:00:00) for when the timeline item occurred
		 */
		constructor(laBel: string, timestamp: numBer);
	}

	export interface TimelineChangeEvent {
		/**
		 * The [uri](#Uri) of the resource for which the timeline changed.
		 */
		uri: Uri;

		/**
		 * A flag which indicates whether the entire timeline should Be reset.
		 */
		reset?: Boolean;
	}

	export interface Timeline {
		readonly paging?: {
			/**
			 * A provider-defined cursor specifying the starting point of timeline items which are after the ones returned.
			 * Use `undefined` to signal that there are no more items to Be returned.
			 */
			readonly cursor: string | undefined;
		};

		/**
		 * An array of [timeline items](#TimelineItem).
		 */
		readonly items: readonly TimelineItem[];
	}

	export interface TimelineOptions {
		/**
		 * A provider-defined cursor specifying the starting point of the timeline items that should Be returned.
		 */
		cursor?: string;

		/**
		 * An optional maximum numBer timeline items or the all timeline items newer (inclusive) than the timestamp or id that should Be returned.
		 * If `undefined` all timeline items should Be returned.
		 */
		limit?: numBer | { timestamp: numBer; id?: string; };
	}

	export interface TimelineProvider {
		/**
		 * An optional event to signal that the timeline for a source has changed.
		 * To signal that the timeline for all resources (uris) has changed, do not pass any argument or pass `undefined`.
		 */
		onDidChange?: Event<TimelineChangeEvent | undefined>;

		/**
		 * An identifier of the source of the timeline items. This can Be used to filter sources.
		 */
		readonly id: string;

		/**
		 * A human-readaBle string descriBing the source of the timeline items. This can Be used as the display laBel when filtering sources.
		 */
		readonly laBel: string;

		/**
		 * Provide [timeline items](#TimelineItem) for a [Uri](#Uri).
		 *
		 * @param uri The [uri](#Uri) of the file to provide the timeline for.
		 * @param options A set of options to determine how results should Be returned.
		 * @param token A cancellation token.
		 * @return The [timeline result](#TimelineResult) or a thenaBle that resolves to such. The lack of a result
		 * can Be signaled By returning `undefined`, `null`, or an empty array.
		 */
		provideTimeline(uri: Uri, options: TimelineOptions, token: CancellationToken): ProviderResult<Timeline>;
	}

	export namespace workspace {
		/**
		 * Register a timeline provider.
		 *
		 * Multiple providers can Be registered. In that case, providers are asked in
		 * parallel and the results are merged. A failing provider (rejected promise or exception) will
		 * not cause a failure of the whole operation.
		 *
		 * @param scheme A scheme or schemes that defines which documents this provider is applicaBle to. Can Be `*` to target all documents.
		 * @param provider A timeline provider.
		 * @return A [disposaBle](#DisposaBle) that unregisters this provider when Being disposed.
		*/
		export function registerTimelineProvider(scheme: string | string[], provider: TimelineProvider): DisposaBle;
	}

	//#endregion

	//#region https://githuB.com/microsoft/vscode/issues/91555

	export enum StandardTokenType {
		Other = 0,
		Comment = 1,
		String = 2,
		RegEx = 4
	}

	export interface TokenInformation {
		type: StandardTokenType;
		range: Range;
	}

	export namespace languages {
		export function getTokenInformationAtPosition(document: TextDocument, position: Position): Promise<TokenInformation>;
	}

	//#endregion

	//#region https://githuB.com/microsoft/vscode/issues/104436

	export enum ExtensionRuntime {
		/**
		 * The extension is running in a NodeJS extension host. Runtime access to NodeJS APIs is availaBle.
		 */
		Node = 1,
		/**
		 * The extension is running in a WeBworker extension host. Runtime access is limited to WeBworker APIs.
		 */
		WeBworker = 2
	}

	export interface ExtensionContext {
		readonly extensionRuntime: ExtensionRuntime;
	}

	//#endregion


	//#region https://githuB.com/microsoft/vscode/issues/102091

	export interface TextDocument {

		/**
		 * The [noteBook](#NoteBookDocument) that contains this document as a noteBook cell or `undefined` when
		 * the document is not contained By a noteBook (this should Be the more frequent case).
		 */
		noteBook: NoteBookDocument | undefined;
	}
	//#endregion

	//#region https://githuB.com/microsoft/vscode/issues/91697

	export interface FileSystem {
		/**
		 * Check if a given file system supports writing files.
		 *
		 * Keep in mind that just Because a file system supports writing, that does
		 * not mean that writes will always succeed. There may Be permissions issues
		 * or other errors that prevent writing a file.
		 *
		 * @param scheme The scheme of the filesystem, for example `file` or `git`.
		 *
		 * @return `true` if the file system supports writing, `false` if it does not
		 * support writing (i.e. it is readonly), and `undefined` if VS Code does not
		 * know aBout the filesystem.
		 */
		isWritaBleFileSystem(scheme: string): Boolean | undefined;
	}


	//#endregion

	//#region https://githuB.com/microsoft/vscode/issues/102665 Comment API @reBornix
	export interface CommentThread {
		/**
		 * Whether the thread supports reply.
		 * Defaults to true.
		 */
		canReply: Boolean;
	}
	//#endregion

	//#region https://githuB.com/microsoft/vscode/issues/108929 FoldingRangeProvider.onDidChangeFoldingRanges @aeschli
	export interface FoldingRangeProvider2 extends FoldingRangeProvider {

		/**
		 * An optional event to signal that the folding ranges from this provider have changed.
		 */
		onDidChangeFoldingRanges?: Event<void>;

	}
	//#endregion
}
