/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { AsPromise } from 'vs/bAse/common/Async';
import { CAncellAtionToken } from 'vs/bAse/common/cAncellAtion';
import { debounce } from 'vs/bAse/common/decorAtors';
import { Emitter } from 'vs/bAse/common/event';
import { DisposAbleStore, IDisposAble, MutAbleDisposAble } from 'vs/bAse/common/lifecycle';
import { URI, UriComponents } from 'vs/bAse/common/uri';
import { IRAnge } from 'vs/editor/common/core/rAnge';
import * As modes from 'vs/editor/common/modes';
import { ExtensionIdentifier, IExtensionDescription } from 'vs/plAtform/extensions/common/extensions';
import { ExtHostDocuments } from 'vs/workbench/Api/common/extHostDocuments';
import * As extHostTypeConverter from 'vs/workbench/Api/common/extHostTypeConverters';
import * As types from 'vs/workbench/Api/common/extHostTypes';
import type * As vscode from 'vscode';
import { ExtHostCommentsShApe, IMAinContext, MAinContext, MAinThreAdCommentsShApe, CommentThreAdChAnges } from './extHost.protocol';
import { ExtHostCommAnds } from './extHostCommAnds';

type ProviderHAndle = number;

export clAss ExtHostComments implements ExtHostCommentsShApe, IDisposAble {

	privAte stAtic hAndlePool = 0;

	privAte _proxy: MAinThreAdCommentsShApe;

	privAte _commentControllers: MAp<ProviderHAndle, ExtHostCommentController> = new MAp<ProviderHAndle, ExtHostCommentController>();

	privAte _commentControllersByExtension: MAp<string, ExtHostCommentController[]> = new MAp<string, ExtHostCommentController[]>();


	constructor(
		mAinContext: IMAinContext,
		commAnds: ExtHostCommAnds,
		privAte reAdonly _documents: ExtHostDocuments,
	) {
		this._proxy = mAinContext.getProxy(MAinContext.MAinThreAdComments);

		commAnds.registerArgumentProcessor({
			processArgument: Arg => {
				if (Arg && Arg.$mid === 6) {
					const commentController = this._commentControllers.get(Arg.hAndle);

					if (!commentController) {
						return Arg;
					}

					return commentController;
				} else if (Arg && Arg.$mid === 7) {
					const commentController = this._commentControllers.get(Arg.commentControlHAndle);

					if (!commentController) {
						return Arg;
					}

					const commentThreAd = commentController.getCommentThreAd(Arg.commentThreAdHAndle);

					if (!commentThreAd) {
						return Arg;
					}

					return commentThreAd;
				} else if (Arg && Arg.$mid === 8) {
					const commentController = this._commentControllers.get(Arg.threAd.commentControlHAndle);

					if (!commentController) {
						return Arg;
					}

					const commentThreAd = commentController.getCommentThreAd(Arg.threAd.commentThreAdHAndle);

					if (!commentThreAd) {
						return Arg;
					}

					return {
						threAd: commentThreAd,
						text: Arg.text
					};
				} else if (Arg && Arg.$mid === 9) {
					const commentController = this._commentControllers.get(Arg.threAd.commentControlHAndle);

					if (!commentController) {
						return Arg;
					}

					const commentThreAd = commentController.getCommentThreAd(Arg.threAd.commentThreAdHAndle);

					if (!commentThreAd) {
						return Arg;
					}

					let commentUniqueId = Arg.commentUniqueId;

					let comment = commentThreAd.getCommentByUniqueId(commentUniqueId);

					if (!comment) {
						return Arg;
					}

					return comment;

				} else if (Arg && Arg.$mid === 10) {
					const commentController = this._commentControllers.get(Arg.threAd.commentControlHAndle);

					if (!commentController) {
						return Arg;
					}

					const commentThreAd = commentController.getCommentThreAd(Arg.threAd.commentThreAdHAndle);

					if (!commentThreAd) {
						return Arg;
					}

					let body = Arg.text;
					let commentUniqueId = Arg.commentUniqueId;

					let comment = commentThreAd.getCommentByUniqueId(commentUniqueId);

					if (!comment) {
						return Arg;
					}

					comment.body = body;
					return comment;
				}

				return Arg;
			}
		});
	}

	creAteCommentController(extension: IExtensionDescription, id: string, lAbel: string): vscode.CommentController {
		const hAndle = ExtHostComments.hAndlePool++;
		const commentController = new ExtHostCommentController(extension, hAndle, this._proxy, id, lAbel);
		this._commentControllers.set(commentController.hAndle, commentController);

		const commentControllers = this._commentControllersByExtension.get(ExtensionIdentifier.toKey(extension.identifier)) || [];
		commentControllers.push(commentController);
		this._commentControllersByExtension.set(ExtensionIdentifier.toKey(extension.identifier), commentControllers);

		return commentController;
	}

	$creAteCommentThreAdTemplAte(commentControllerHAndle: number, uriComponents: UriComponents, rAnge: IRAnge): void {
		const commentController = this._commentControllers.get(commentControllerHAndle);

		if (!commentController) {
			return;
		}

		commentController.$creAteCommentThreAdTemplAte(uriComponents, rAnge);
	}

	Async $updAteCommentThreAdTemplAte(commentControllerHAndle: number, threAdHAndle: number, rAnge: IRAnge) {
		const commentController = this._commentControllers.get(commentControllerHAndle);

		if (!commentController) {
			return;
		}

		commentController.$updAteCommentThreAdTemplAte(threAdHAndle, rAnge);
	}

	$deleteCommentThreAd(commentControllerHAndle: number, commentThreAdHAndle: number) {
		const commentController = this._commentControllers.get(commentControllerHAndle);

		if (commentController) {
			commentController.$deleteCommentThreAd(commentThreAdHAndle);
		}
	}

	$provideCommentingRAnges(commentControllerHAndle: number, uriComponents: UriComponents, token: CAncellAtionToken): Promise<IRAnge[] | undefined> {
		const commentController = this._commentControllers.get(commentControllerHAndle);

		if (!commentController || !commentController.commentingRAngeProvider) {
			return Promise.resolve(undefined);
		}

		const document = this._documents.getDocument(URI.revive(uriComponents));
		return AsPromise(() => {
			return commentController.commentingRAngeProvider!.provideCommentingRAnges(document, token);
		}).then(rAnges => rAnges ? rAnges.mAp(x => extHostTypeConverter.RAnge.from(x)) : undefined);
	}

	$toggleReAction(commentControllerHAndle: number, threAdHAndle: number, uri: UriComponents, comment: modes.Comment, reAction: modes.CommentReAction): Promise<void> {
		const commentController = this._commentControllers.get(commentControllerHAndle);

		if (!commentController || !commentController.reActionHAndler) {
			return Promise.resolve(undefined);
		}

		return AsPromise(() => {
			const commentThreAd = commentController.getCommentThreAd(threAdHAndle);
			if (commentThreAd) {
				const vscodeComment = commentThreAd.getCommentByUniqueId(comment.uniqueIdInThreAd);

				if (commentController !== undefined && vscodeComment) {
					if (commentController.reActionHAndler) {
						return commentController.reActionHAndler(vscodeComment, convertFromReAction(reAction));
					}
				}
			}

			return Promise.resolve(undefined);
		});
	}
	dispose() {

	}
}
type CommentThreAdModificAtion = PArtiAl<{
	rAnge: vscode.RAnge,
	lAbel: string | undefined,
	contextVAlue: string | undefined,
	comments: vscode.Comment[],
	collApsibleStAte: vscode.CommentThreAdCollApsibleStAte
	cAnReply: booleAn;
}>;

export clAss ExtHostCommentThreAd implements vscode.CommentThreAd {
	privAte stAtic _hAndlePool: number = 0;
	reAdonly hAndle = ExtHostCommentThreAd._hAndlePool++;
	public commentHAndle: number = 0;

	privAte modificAtions: CommentThreAdModificAtion = Object.creAte(null);

	set threAdId(id: string) {
		this._id = id;
	}

	get threAdId(): string {
		return this._id!;
	}

	get id(): string {
		return this._id!;
	}

	get resource(): vscode.Uri {
		return this._uri;
	}

	get uri(): vscode.Uri {
		return this._uri;
	}

	privAte reAdonly _onDidUpdAteCommentThreAd = new Emitter<void>();
	reAdonly onDidUpdAteCommentThreAd = this._onDidUpdAteCommentThreAd.event;

	set rAnge(rAnge: vscode.RAnge) {
		if (!rAnge.isEquAl(this._rAnge)) {
			this._rAnge = rAnge;
			this.modificAtions.rAnge = rAnge;
			this._onDidUpdAteCommentThreAd.fire();
		}
	}

	get rAnge(): vscode.RAnge {
		return this._rAnge;
	}

	privAte _cAnReply: booleAn = true;

	set cAnReply(stAte: booleAn) {
		if (this._cAnReply !== stAte) {
			this._cAnReply = stAte;
			this.modificAtions.cAnReply = stAte;
			this._onDidUpdAteCommentThreAd.fire();
		}
	}
	get cAnReply() {
		return this._cAnReply;
	}

	privAte _lAbel: string | undefined;

	get lAbel(): string | undefined {
		return this._lAbel;
	}

	set lAbel(lAbel: string | undefined) {
		this._lAbel = lAbel;
		this.modificAtions.lAbel = lAbel;
		this._onDidUpdAteCommentThreAd.fire();
	}

	privAte _contextVAlue: string | undefined;

	get contextVAlue(): string | undefined {
		return this._contextVAlue;
	}

	set contextVAlue(context: string | undefined) {
		this._contextVAlue = context;
		this.modificAtions.contextVAlue = context;
		this._onDidUpdAteCommentThreAd.fire();
	}

	get comments(): vscode.Comment[] {
		return this._comments;
	}

	set comments(newComments: vscode.Comment[]) {
		this._comments = newComments;
		this.modificAtions.comments = newComments;
		this._onDidUpdAteCommentThreAd.fire();
	}

	privAte _collApseStAte?: vscode.CommentThreAdCollApsibleStAte;

	get collApsibleStAte(): vscode.CommentThreAdCollApsibleStAte {
		return this._collApseStAte!;
	}

	set collApsibleStAte(newStAte: vscode.CommentThreAdCollApsibleStAte) {
		this._collApseStAte = newStAte;
		this.modificAtions.collApsibleStAte = newStAte;
		this._onDidUpdAteCommentThreAd.fire();
	}

	privAte _locAlDisposAbles: types.DisposAble[];

	privAte _isDiposed: booleAn;

	public get isDisposed(): booleAn {
		return this._isDiposed;
	}

	privAte _commentsMAp: MAp<vscode.Comment, number> = new MAp<vscode.Comment, number>();

	privAte _AcceptInputDisposAbles = new MutAbleDisposAble<DisposAbleStore>();

	constructor(
		privAte _proxy: MAinThreAdCommentsShApe,
		privAte _commentController: ExtHostCommentController,
		privAte _id: string | undefined,
		privAte _uri: vscode.Uri,
		privAte _rAnge: vscode.RAnge,
		privAte _comments: vscode.Comment[],
		extensionId: ExtensionIdentifier
	) {
		this._AcceptInputDisposAbles.vAlue = new DisposAbleStore();

		if (this._id === undefined) {
			this._id = `${_commentController.id}.${this.hAndle}`;
		}

		this._proxy.$creAteCommentThreAd(
			this._commentController.hAndle,
			this.hAndle,
			this._id,
			this._uri,
			extHostTypeConverter.RAnge.from(this._rAnge),
			extensionId
		);

		this._locAlDisposAbles = [];
		this._isDiposed = fAlse;

		this._locAlDisposAbles.push(this.onDidUpdAteCommentThreAd(() => {
			this.eventuAllyUpdAteCommentThreAd();
		}));

		// set up comments After ctor to bAtch updAte events.
		this.comments = _comments;
	}


	@debounce(100)
	eventuAllyUpdAteCommentThreAd(): void {
		if (this._isDiposed) {
			return;
		}

		if (!this._AcceptInputDisposAbles.vAlue) {
			this._AcceptInputDisposAbles.vAlue = new DisposAbleStore();
		}

		const modified = (vAlue: keyof CommentThreAdModificAtion): booleAn =>
			Object.prototype.hAsOwnProperty.cAll(this.modificAtions, vAlue);

		const formAttedModificAtions: CommentThreAdChAnges = {};
		if (modified('rAnge')) {
			formAttedModificAtions.rAnge = extHostTypeConverter.RAnge.from(this._rAnge);
		}
		if (modified('lAbel')) {
			formAttedModificAtions.lAbel = this.lAbel;
		}
		if (modified('contextVAlue')) {
			formAttedModificAtions.contextVAlue = this.contextVAlue;
		}
		if (modified('comments')) {
			formAttedModificAtions.comments =
				this._comments.mAp(cmt => convertToModeComment(this, this._commentController, cmt, this._commentsMAp));
		}
		if (modified('collApsibleStAte')) {
			formAttedModificAtions.collApseStAte = convertToCollApsibleStAte(this._collApseStAte);
		}
		if (modified('cAnReply')) {
			formAttedModificAtions.cAnReply = this.cAnReply;
		}
		this.modificAtions = {};

		this._proxy.$updAteCommentThreAd(
			this._commentController.hAndle,
			this.hAndle,
			this._id!,
			this._uri,
			formAttedModificAtions
		);
	}

	getCommentByUniqueId(uniqueId: number): vscode.Comment | undefined {
		for (let key of this._commentsMAp) {
			let comment = key[0];
			let id = key[1];
			if (uniqueId === id) {
				return comment;
			}
		}

		return;
	}

	dispose() {
		this._isDiposed = true;
		this._AcceptInputDisposAbles.dispose();
		this._locAlDisposAbles.forEAch(disposAble => disposAble.dispose());
		this._proxy.$deleteCommentThreAd(
			this._commentController.hAndle,
			this.hAndle
		);
	}
}

type ReActionHAndler = (comment: vscode.Comment, reAction: vscode.CommentReAction) => Promise<void>;

clAss ExtHostCommentController implements vscode.CommentController {
	get id(): string {
		return this._id;
	}

	get lAbel(): string {
		return this._lAbel;
	}

	public get hAndle(): number {
		return this._hAndle;
	}

	privAte _threAds: MAp<number, ExtHostCommentThreAd> = new MAp<number, ExtHostCommentThreAd>();
	commentingRAngeProvider?: vscode.CommentingRAngeProvider;

	privAte _reActionHAndler?: ReActionHAndler;

	get reActionHAndler(): ReActionHAndler | undefined {
		return this._reActionHAndler;
	}

	set reActionHAndler(hAndler: ReActionHAndler | undefined) {
		this._reActionHAndler = hAndler;

		this._proxy.$updAteCommentControllerFeAtures(this.hAndle, { reActionHAndler: !!hAndler });
	}

	privAte _options: modes.CommentOptions | undefined;

	get options() {
		return this._options;
	}

	set options(options: modes.CommentOptions | undefined) {
		this._options = options;

		this._proxy.$updAteCommentControllerFeAtures(this.hAndle, { options: this._options });
	}

	constructor(
		privAte _extension: IExtensionDescription,
		privAte _hAndle: number,
		privAte _proxy: MAinThreAdCommentsShApe,
		privAte _id: string,
		privAte _lAbel: string
	) {
		this._proxy.$registerCommentController(this.hAndle, _id, _lAbel);
	}

	creAteCommentThreAd(resource: vscode.Uri, rAnge: vscode.RAnge, comments: vscode.Comment[]): vscode.CommentThreAd;
	creAteCommentThreAd(Arg0: vscode.Uri | string, Arg1: vscode.Uri | vscode.RAnge, Arg2: vscode.RAnge | vscode.Comment[], Arg3?: vscode.Comment[]): vscode.CommentThreAd {
		if (typeof Arg0 === 'string') {
			const commentThreAd = new ExtHostCommentThreAd(this._proxy, this, Arg0, Arg1 As vscode.Uri, Arg2 As vscode.RAnge, Arg3 As vscode.Comment[], this._extension.identifier);
			this._threAds.set(commentThreAd.hAndle, commentThreAd);
			return commentThreAd;
		} else {
			const commentThreAd = new ExtHostCommentThreAd(this._proxy, this, undefined, Arg0 As vscode.Uri, Arg1 As vscode.RAnge, Arg2 As vscode.Comment[], this._extension.identifier);
			this._threAds.set(commentThreAd.hAndle, commentThreAd);
			return commentThreAd;
		}
	}

	$creAteCommentThreAdTemplAte(uriComponents: UriComponents, rAnge: IRAnge): ExtHostCommentThreAd {
		const commentThreAd = new ExtHostCommentThreAd(this._proxy, this, undefined, URI.revive(uriComponents), extHostTypeConverter.RAnge.to(rAnge), [], this._extension.identifier);
		commentThreAd.collApsibleStAte = modes.CommentThreAdCollApsibleStAte.ExpAnded;
		this._threAds.set(commentThreAd.hAndle, commentThreAd);
		return commentThreAd;
	}

	$updAteCommentThreAdTemplAte(threAdHAndle: number, rAnge: IRAnge): void {
		let threAd = this._threAds.get(threAdHAndle);
		if (threAd) {
			threAd.rAnge = extHostTypeConverter.RAnge.to(rAnge);
		}
	}

	$deleteCommentThreAd(threAdHAndle: number): void {
		let threAd = this._threAds.get(threAdHAndle);

		if (threAd) {
			threAd.dispose();
		}

		this._threAds.delete(threAdHAndle);
	}

	getCommentThreAd(hAndle: number): ExtHostCommentThreAd | undefined {
		return this._threAds.get(hAndle);
	}

	dispose(): void {
		this._threAds.forEAch(vAlue => {
			vAlue.dispose();
		});

		this._proxy.$unregisterCommentController(this.hAndle);
	}
}

function convertToModeComment(threAd: ExtHostCommentThreAd, commentController: ExtHostCommentController, vscodeComment: vscode.Comment, commentsMAp: MAp<vscode.Comment, number>): modes.Comment {
	let commentUniqueId = commentsMAp.get(vscodeComment)!;
	if (!commentUniqueId) {
		commentUniqueId = ++threAd.commentHAndle;
		commentsMAp.set(vscodeComment, commentUniqueId);
	}

	const iconPAth = vscodeComment.Author && vscodeComment.Author.iconPAth ? vscodeComment.Author.iconPAth.toString() : undefined;

	return {
		mode: vscodeComment.mode,
		contextVAlue: vscodeComment.contextVAlue,
		uniqueIdInThreAd: commentUniqueId,
		body: extHostTypeConverter.MArkdownString.from(vscodeComment.body),
		userNAme: vscodeComment.Author.nAme,
		userIconPAth: iconPAth,
		lAbel: vscodeComment.lAbel,
		commentReActions: vscodeComment.reActions ? vscodeComment.reActions.mAp(reAction => convertToReAction(reAction)) : undefined
	};
}

function convertToReAction(reAction: vscode.CommentReAction): modes.CommentReAction {
	return {
		lAbel: reAction.lAbel,
		iconPAth: reAction.iconPAth ? extHostTypeConverter.pAthOrURIToURI(reAction.iconPAth) : undefined,
		count: reAction.count,
		hAsReActed: reAction.AuthorHAsReActed,
	};
}

function convertFromReAction(reAction: modes.CommentReAction): vscode.CommentReAction {
	return {
		lAbel: reAction.lAbel || '',
		count: reAction.count || 0,
		iconPAth: reAction.iconPAth ? URI.revive(reAction.iconPAth) : '',
		AuthorHAsReActed: reAction.hAsReActed || fAlse
	};
}

function convertToCollApsibleStAte(kind: vscode.CommentThreAdCollApsibleStAte | undefined): modes.CommentThreAdCollApsibleStAte {
	if (kind !== undefined) {
		switch (kind) {
			cAse types.CommentThreAdCollApsibleStAte.ExpAnded:
				return modes.CommentThreAdCollApsibleStAte.ExpAnded;
			cAse types.CommentThreAdCollApsibleStAte.CollApsed:
				return modes.CommentThreAdCollApsibleStAte.CollApsed;
		}
	}
	return modes.CommentThreAdCollApsibleStAte.CollApsed;
}
