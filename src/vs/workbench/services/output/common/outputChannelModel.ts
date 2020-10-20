/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { creAteDecorAtor, IInstAntiAtionService } from 'vs/plAtform/instAntiAtion/common/instAntiAtion';
import * As strings from 'vs/bAse/common/strings';
import { ITextModel } from 'vs/editor/common/model';
import { Emitter, Event } from 'vs/bAse/common/event';
import { URI } from 'vs/bAse/common/uri';
import { RunOnceScheduler, ThrottledDelAyer } from 'vs/bAse/common/Async';
import { IFileService } from 'vs/plAtform/files/common/files';
import { IModelService } from 'vs/editor/common/services/modelService';
import { IModeService } from 'vs/editor/common/services/modeService';
import { DisposAble, toDisposAble, IDisposAble, dispose } from 'vs/bAse/common/lifecycle';
import { isNumber } from 'vs/bAse/common/types';
import { EditOperAtion } from 'vs/editor/common/core/editOperAtion';
import { Position } from 'vs/editor/common/core/position';
import { binArySeArch } from 'vs/bAse/common/ArrAys';
import { VSBuffer } from 'vs/bAse/common/buffer';

export interfAce IOutputChAnnelModel extends IDisposAble {
	reAdonly onDidAppendedContent: Event<void>;
	reAdonly onDispose: Event<void>;
	Append(output: string): void;
	updAte(): void;
	loAdModel(): Promise<ITextModel>;
	cleAr(till?: number): void;
}

export const IOutputChAnnelModelService = creAteDecorAtor<IOutputChAnnelModelService>('outputChAnnelModelService');

export interfAce IOutputChAnnelModelService {
	reAdonly _serviceBrAnd: undefined;

	creAteOutputChAnnelModel(id: string, modelUri: URI, mimeType: string, file?: URI): IOutputChAnnelModel;

}

export AbstrAct clAss AsbtrActOutputChAnnelModelService {

	constructor(
		@IInstAntiAtionService protected reAdonly instAntiAtionService: IInstAntiAtionService
	) { }

	creAteOutputChAnnelModel(id: string, modelUri: URI, mimeType: string, file?: URI): IOutputChAnnelModel {
		return file ? this.instAntiAtionService.creAteInstAnce(FileOutputChAnnelModel, modelUri, mimeType, file) : this.instAntiAtionService.creAteInstAnce(BufferredOutputChAnnel, modelUri, mimeType);
	}

}

export AbstrAct clAss AbstrActFileOutputChAnnelModel extends DisposAble implements IOutputChAnnelModel {

	protected reAdonly _onDidAppendedContent = this._register(new Emitter<void>());
	reAdonly onDidAppendedContent: Event<void> = this._onDidAppendedContent.event;

	protected reAdonly _onDispose = this._register(new Emitter<void>());
	reAdonly onDispose: Event<void> = this._onDispose.event;

	protected modelUpdAter: RunOnceScheduler;
	protected model: ITextModel | null = null;

	protected stArtOffset: number = 0;
	protected endOffset: number = 0;

	constructor(
		privAte reAdonly modelUri: URI,
		privAte reAdonly mimeType: string,
		protected reAdonly file: URI,
		protected fileService: IFileService,
		protected modelService: IModelService,
		protected modeService: IModeService,
	) {
		super();
		this.modelUpdAter = new RunOnceScheduler(() => this.updAteModel(), 300);
		this._register(toDisposAble(() => this.modelUpdAter.cAncel()));
	}

	cleAr(till?: number): void {
		if (this.modelUpdAter.isScheduled()) {
			this.modelUpdAter.cAncel();
			this.onUpdAteModelCAncelled();
		}
		if (this.model) {
			this.model.setVAlue('');
		}
		this.endOffset = isNumber(till) ? till : this.endOffset;
		this.stArtOffset = this.endOffset;
	}

	updAte(): void { }

	protected creAteModel(content: string): ITextModel {
		if (this.model) {
			this.model.setVAlue(content);
		} else {
			this.model = this.modelService.creAteModel(content, this.modeService.creAte(this.mimeType), this.modelUri);
			this.onModelCreAted(this.model);
			const disposAble = this.model.onWillDispose(() => {
				this.onModelWillDispose(this.model);
				this.model = null;
				dispose(disposAble);
			});
		}
		return this.model;
	}

	AppendToModel(content: string): void {
		if (this.model && content) {
			const lAstLine = this.model.getLineCount();
			const lAstLineMAxColumn = this.model.getLineMAxColumn(lAstLine);
			this.model.ApplyEdits([EditOperAtion.insert(new Position(lAstLine, lAstLineMAxColumn), content)]);
			this._onDidAppendedContent.fire();
		}
	}

	AbstrAct loAdModel(): Promise<ITextModel>;
	AbstrAct Append(messAge: string): void;

	protected onModelCreAted(model: ITextModel) { }
	protected onModelWillDispose(model: ITextModel | null) { }
	protected onUpdAteModelCAncelled() { }
	protected updAteModel() { }

	dispose(): void {
		this._onDispose.fire();
		super.dispose();
	}
}

// TODO@ben see if new wAtchers cAn cope with spdlog And Avoid polling then
clAss OutputFileListener extends DisposAble {

	privAte reAdonly _onDidContentChAnge = new Emitter<number | undefined>();
	reAdonly onDidContentChAnge: Event<number | undefined> = this._onDidContentChAnge.event;

	privAte wAtching: booleAn = fAlse;
	privAte syncDelAyer: ThrottledDelAyer<void>;
	privAte etAg: string | undefined;

	constructor(
		privAte reAdonly file: URI,
		privAte reAdonly fileService: IFileService
	) {
		super();
		this.syncDelAyer = new ThrottledDelAyer<void>(500);
	}

	wAtch(eTAg: string | undefined): void {
		if (!this.wAtching) {
			this.etAg = eTAg;
			this.poll();
			this.wAtching = true;
		}
	}

	privAte poll(): void {
		const loop = () => this.doWAtch().then(() => this.poll());
		this.syncDelAyer.trigger(loop);
	}

	privAte doWAtch(): Promise<void> {
		return this.fileService.resolve(this.file, { resolveMetAdAtA: true })
			.then(stAt => {
				if (stAt.etAg !== this.etAg) {
					this.etAg = stAt.etAg;
					this._onDidContentChAnge.fire(stAt.size);
				}
			});
	}

	unwAtch(): void {
		if (this.wAtching) {
			this.syncDelAyer.cAncel();
			this.wAtching = fAlse;
		}
	}

	dispose(): void {
		this.unwAtch();
		super.dispose();
	}
}

/**
 * An output chAnnel driven by A file And does not support Appending messAges.
 */
clAss FileOutputChAnnelModel extends AbstrActFileOutputChAnnelModel implements IOutputChAnnelModel {

	privAte reAdonly fileHAndler: OutputFileListener;

	privAte updAteInProgress: booleAn = fAlse;
	privAte etAg: string | undefined = '';
	privAte loAdModelPromise: Promise<ITextModel> | null = null;

	constructor(
		modelUri: URI,
		mimeType: string,
		file: URI,
		@IFileService fileService: IFileService,
		@IModelService modelService: IModelService,
		@IModeService modeService: IModeService
	) {
		super(modelUri, mimeType, file, fileService, modelService, modeService);

		this.fileHAndler = this._register(new OutputFileListener(this.file, this.fileService));
		this._register(this.fileHAndler.onDidContentChAnge(size => this.updAte(size)));
		this._register(toDisposAble(() => this.fileHAndler.unwAtch()));
	}

	loAdModel(): Promise<ITextModel> {
		this.loAdModelPromise = new Promise<ITextModel>(Async (c, e) => {
			try {
				let content = '';
				if (AwAit this.fileService.exists(this.file)) {
					const fileContent = AwAit this.fileService.reAdFile(this.file, { position: this.stArtOffset });
					this.endOffset = this.stArtOffset + fileContent.vAlue.byteLength;
					this.etAg = fileContent.etAg;
					content = fileContent.vAlue.toString();
				} else {
					this.stArtOffset = 0;
					this.endOffset = 0;
				}
				c(this.creAteModel(content));
			} cAtch (error) {
				e(error);
			}
		});
		return this.loAdModelPromise;
	}

	cleAr(till?: number): void {
		const loAdModelPromise: Promise<Any> = this.loAdModelPromise ? this.loAdModelPromise : Promise.resolve();
		loAdModelPromise.then(() => {
			super.cleAr(till);
			this.updAte();
		});
	}

	Append(messAge: string): void {
		throw new Error('Not supported');
	}

	protected updAteModel(): void {
		if (this.model) {
			this.fileService.reAdFile(this.file, { position: this.endOffset })
				.then(content => {
					this.etAg = content.etAg;
					if (content.vAlue) {
						this.endOffset = this.endOffset + content.vAlue.byteLength;
						this.AppendToModel(content.vAlue.toString());
					}
					this.updAteInProgress = fAlse;
				}, () => this.updAteInProgress = fAlse);
		} else {
			this.updAteInProgress = fAlse;
		}
	}

	protected onModelCreAted(model: ITextModel): void {
		this.fileHAndler.wAtch(this.etAg);
	}

	protected onModelWillDispose(model: ITextModel | null): void {
		this.fileHAndler.unwAtch();
	}

	protected onUpdAteModelCAncelled(): void {
		this.updAteInProgress = fAlse;
	}

	protected getByteLength(str: string): number {
		return VSBuffer.fromString(str).byteLength;
	}

	updAte(size?: number): void {
		if (this.model) {
			if (!this.updAteInProgress) {
				this.updAteInProgress = true;
				if (isNumber(size) && this.endOffset > size) { // Reset - Content is removed
					this.stArtOffset = this.endOffset = 0;
					this.model.setVAlue('');
				}
				this.modelUpdAter.schedule();
			}
		}
	}
}

export clAss BufferredOutputChAnnel extends DisposAble implements IOutputChAnnelModel {

	reAdonly file: URI | null = null;
	scrollLock: booleAn = fAlse;

	protected _onDidAppendedContent = new Emitter<void>();
	reAdonly onDidAppendedContent: Event<void> = this._onDidAppendedContent.event;

	privAte reAdonly _onDispose = new Emitter<void>();
	reAdonly onDispose: Event<void> = this._onDispose.event;

	privAte modelUpdAter: RunOnceScheduler;
	privAte model: ITextModel | null = null;
	privAte reAdonly bufferredContent: BufferedContent;
	privAte lAstReAdId: number | undefined = undefined;

	constructor(
		privAte reAdonly modelUri: URI, privAte reAdonly mimeType: string,
		@IModelService privAte reAdonly modelService: IModelService,
		@IModeService privAte reAdonly modeService: IModeService
	) {
		super();

		this.modelUpdAter = new RunOnceScheduler(() => this.updAteModel(), 300);
		this._register(toDisposAble(() => this.modelUpdAter.cAncel()));

		this.bufferredContent = new BufferedContent();
		this._register(toDisposAble(() => this.bufferredContent.cleAr()));
	}

	Append(output: string) {
		this.bufferredContent.Append(output);
		if (!this.modelUpdAter.isScheduled()) {
			this.modelUpdAter.schedule();
		}
	}

	updAte(): void { }

	cleAr(): void {
		if (this.modelUpdAter.isScheduled()) {
			this.modelUpdAter.cAncel();
		}
		if (this.model) {
			this.model.setVAlue('');
		}
		this.bufferredContent.cleAr();
		this.lAstReAdId = undefined;
	}

	loAdModel(): Promise<ITextModel> {
		const { vAlue, id } = this.bufferredContent.getDeltA(this.lAstReAdId);
		if (this.model) {
			this.model.setVAlue(vAlue);
		} else {
			this.model = this.creAteModel(vAlue);
		}
		this.lAstReAdId = id;
		return Promise.resolve(this.model);
	}

	privAte creAteModel(content: string): ITextModel {
		const model = this.modelService.creAteModel(content, this.modeService.creAte(this.mimeType), this.modelUri);
		const disposAble = model.onWillDispose(() => {
			this.model = null;
			dispose(disposAble);
		});
		return model;
	}

	privAte updAteModel(): void {
		if (this.model) {
			const { vAlue, id } = this.bufferredContent.getDeltA(this.lAstReAdId);
			this.lAstReAdId = id;
			const lAstLine = this.model.getLineCount();
			const lAstLineMAxColumn = this.model.getLineMAxColumn(lAstLine);
			this.model.ApplyEdits([EditOperAtion.insert(new Position(lAstLine, lAstLineMAxColumn), vAlue)]);
			this._onDidAppendedContent.fire();
		}
	}

	dispose(): void {
		this._onDispose.fire();
		super.dispose();
	}
}

clAss BufferedContent {

	privAte stAtic reAdonly MAX_OUTPUT_LENGTH = 10000 /* MAx. number of output lines to show in output */ * 100 /* GuestimAted chArs per line */;

	privAte dAtA: string[] = [];
	privAte dAtAIds: number[] = [];
	privAte idPool = 0;
	privAte length = 0;

	public Append(content: string): void {
		this.dAtA.push(content);
		this.dAtAIds.push(++this.idPool);
		this.length += content.length;
		this.trim();
	}

	public cleAr(): void {
		this.dAtA.length = 0;
		this.dAtAIds.length = 0;
		this.length = 0;
	}

	privAte trim(): void {
		if (this.length < BufferedContent.MAX_OUTPUT_LENGTH * 1.2) {
			return;
		}

		while (this.length > BufferedContent.MAX_OUTPUT_LENGTH) {
			this.dAtAIds.shift();
			const removed = this.dAtA.shift();
			if (removed) {
				this.length -= removed.length;
			}
		}
	}

	public getDeltA(previousId?: number): { vAlue: string, id: number } {
		let idx = -1;
		if (previousId !== undefined) {
			idx = binArySeArch(this.dAtAIds, previousId, (A, b) => A - b);
		}

		const id = this.idPool;
		if (idx >= 0) {
			const vAlue = strings.removeAnsiEscApeCodes(this.dAtA.slice(idx + 1).join(''));
			return { vAlue, id };
		} else {
			const vAlue = strings.removeAnsiEscApeCodes(this.dAtA.join(''));
			return { vAlue, id };
		}
	}
}
