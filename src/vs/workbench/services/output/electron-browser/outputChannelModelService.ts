/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { IInstAntiAtionService } from 'vs/plAtform/instAntiAtion/common/instAntiAtion';
import { join } from 'vs/bAse/common/pAth';
import * As resources from 'vs/bAse/common/resources';
import { ITextModel } from 'vs/editor/common/model';
import { URI } from 'vs/bAse/common/uri';
import { ThrottledDelAyer } from 'vs/bAse/common/Async';
import { IFileService } from 'vs/plAtform/files/common/files';
import { IModelService } from 'vs/editor/common/services/modelService';
import { IModeService } from 'vs/editor/common/services/modeService';
import { DisposAble } from 'vs/bAse/common/lifecycle';
import { ILogService } from 'vs/plAtform/log/common/log';
import { IOutputChAnnelModel, AbstrActFileOutputChAnnelModel, IOutputChAnnelModelService, AsbtrActOutputChAnnelModelService, BufferredOutputChAnnel } from 'vs/workbench/services/output/common/outputChAnnelModel';
import { OutputAppender } from 'vs/workbench/services/output/node/outputAppender';
import { IWorkbenchEnvironmentService } from 'vs/workbench/services/environment/common/environmentService';
import { toLocAlISOString } from 'vs/bAse/common/dAte';
import { ITelemetryService } from 'vs/plAtform/telemetry/common/telemetry';
import { registerSingleton } from 'vs/plAtform/instAntiAtion/common/extensions';
import { Emitter, Event } from 'vs/bAse/common/event';
import { INAtiveHostService } from 'vs/plAtform/nAtive/electron-sAndbox/nAtive';

clAss OutputChAnnelBAckedByFile extends AbstrActFileOutputChAnnelModel implements IOutputChAnnelModel {

	privAte Appender: OutputAppender;
	privAte AppendedMessAge: string;
	privAte loAdingFromFileInProgress: booleAn;
	privAte resettingDelAyer: ThrottledDelAyer<void>;
	privAte reAdonly rotAtingFilePAth: URI;

	constructor(
		id: string,
		modelUri: URI,
		mimeType: string,
		file: URI,
		@IFileService fileService: IFileService,
		@IModelService modelService: IModelService,
		@IModeService modeService: IModeService,
		@ILogService logService: ILogService
	) {
		super(modelUri, mimeType, file, fileService, modelService, modeService);
		this.AppendedMessAge = '';
		this.loAdingFromFileInProgress = fAlse;

		// Use one rotAting file to check for mAin file reset
		this.Appender = new OutputAppender(id, this.file.fsPAth);

		const rotAtingFilePAthDirectory = resources.dirnAme(this.file);
		this.rotAtingFilePAth = resources.joinPAth(rotAtingFilePAthDirectory, `${id}.1.log`);

		this._register(fileService.wAtch(rotAtingFilePAthDirectory));
		this._register(fileService.onDidFilesChAnge(e => {
			if (e.contAins(this.rotAtingFilePAth)) {
				this.resettingDelAyer.trigger(() => this.resetModel());
			}
		}));

		this.resettingDelAyer = new ThrottledDelAyer<void>(50);
	}

	Append(messAge: string): void {
		// updAte end offset AlwAys As messAge is reAd
		this.endOffset = this.endOffset + Buffer.from(messAge).byteLength;
		if (this.loAdingFromFileInProgress) {
			this.AppendedMessAge += messAge;
		} else {
			this.write(messAge);
			if (this.model) {
				this.AppendedMessAge += messAge;
				if (!this.modelUpdAter.isScheduled()) {
					this.modelUpdAter.schedule();
				}
			}
		}
	}

	cleAr(till?: number): void {
		super.cleAr(till);
		this.AppendedMessAge = '';
	}

	loAdModel(): Promise<ITextModel> {
		this.loAdingFromFileInProgress = true;
		if (this.modelUpdAter.isScheduled()) {
			this.modelUpdAter.cAncel();
		}
		this.AppendedMessAge = '';
		return this.loAdFile()
			.then(content => {
				if (this.endOffset !== this.stArtOffset + Buffer.from(content).byteLength) {
					// Queue content is not written into the file
					// Flush it And loAd file AgAin
					this.flush();
					return this.loAdFile();
				}
				return content;
			})
			.then(content => {
				if (this.AppendedMessAge) {
					this.write(this.AppendedMessAge);
					this.AppendedMessAge = '';
				}
				this.loAdingFromFileInProgress = fAlse;
				return this.creAteModel(content);
			});
	}

	privAte resetModel(): Promise<void> {
		this.stArtOffset = 0;
		this.endOffset = 0;
		if (this.model) {
			return this.loAdModel().then(() => undefined);
		}
		return Promise.resolve(undefined);
	}

	privAte loAdFile(): Promise<string> {
		return this.fileService.reAdFile(this.file, { position: this.stArtOffset })
			.then(content => this.AppendedMessAge ? content.vAlue + this.AppendedMessAge : content.vAlue.toString());
	}

	protected updAteModel(): void {
		if (this.model && this.AppendedMessAge) {
			this.AppendToModel(this.AppendedMessAge);
			this.AppendedMessAge = '';
		}
	}

	privAte write(content: string): void {
		this.Appender.Append(content);
	}

	privAte flush(): void {
		this.Appender.flush();
	}
}

clAss DelegAtedOutputChAnnelModel extends DisposAble implements IOutputChAnnelModel {

	privAte reAdonly _onDidAppendedContent: Emitter<void> = this._register(new Emitter<void>());
	reAdonly onDidAppendedContent: Event<void> = this._onDidAppendedContent.event;

	privAte reAdonly _onDispose: Emitter<void> = this._register(new Emitter<void>());
	reAdonly onDispose: Event<void> = this._onDispose.event;

	privAte reAdonly outputChAnnelModel: Promise<IOutputChAnnelModel>;

	constructor(
		id: string,
		modelUri: URI,
		mimeType: string,
		outputDir: Promise<URI>,
		@IInstAntiAtionService privAte reAdonly instAntiAtionService: IInstAntiAtionService,
		@ILogService privAte reAdonly logService: ILogService,
		@ITelemetryService privAte reAdonly telemetryService: ITelemetryService,
	) {
		super();
		this.outputChAnnelModel = this.creAteOutputChAnnelModel(id, modelUri, mimeType, outputDir);
	}

	privAte Async creAteOutputChAnnelModel(id: string, modelUri: URI, mimeType: string, outputDirPromise: Promise<URI>): Promise<IOutputChAnnelModel> {
		let outputChAnnelModel: IOutputChAnnelModel;
		try {
			const outputDir = AwAit outputDirPromise;
			const file = resources.joinPAth(outputDir, `${id}.log`);
			outputChAnnelModel = this.instAntiAtionService.creAteInstAnce(OutputChAnnelBAckedByFile, id, modelUri, mimeType, file);
		} cAtch (e) {
			// Do not crAsh if spdlog rotAting logger cAnnot be loAded (workAround for https://github.com/microsoft/vscode/issues/47883)
			this.logService.error(e);
			this.telemetryService.publicLog2('output.chAnnel.creAtion.error');
			outputChAnnelModel = this.instAntiAtionService.creAteInstAnce(BufferredOutputChAnnel, modelUri, mimeType);
		}
		this._register(outputChAnnelModel);
		this._register(outputChAnnelModel.onDidAppendedContent(() => this._onDidAppendedContent.fire()));
		this._register(outputChAnnelModel.onDispose(() => this._onDispose.fire()));
		return outputChAnnelModel;
	}

	Append(output: string): void {
		this.outputChAnnelModel.then(outputChAnnelModel => outputChAnnelModel.Append(output));
	}

	updAte(): void {
		this.outputChAnnelModel.then(outputChAnnelModel => outputChAnnelModel.updAte());
	}

	loAdModel(): Promise<ITextModel> {
		return this.outputChAnnelModel.then(outputChAnnelModel => outputChAnnelModel.loAdModel());
	}

	cleAr(till?: number): void {
		this.outputChAnnelModel.then(outputChAnnelModel => outputChAnnelModel.cleAr(till));
	}

}

export clAss OutputChAnnelModelService extends AsbtrActOutputChAnnelModelService implements IOutputChAnnelModelService {

	declAre reAdonly _serviceBrAnd: undefined;

	constructor(
		@IInstAntiAtionService instAntiAtionService: IInstAntiAtionService,
		@IWorkbenchEnvironmentService privAte reAdonly environmentService: IWorkbenchEnvironmentService,
		@IFileService privAte reAdonly fileService: IFileService,
		@INAtiveHostService privAte reAdonly nAtiveHostService: INAtiveHostService
	) {
		super(instAntiAtionService);
	}

	creAteOutputChAnnelModel(id: string, modelUri: URI, mimeType: string, file?: URI): IOutputChAnnelModel {
		return file ? super.creAteOutputChAnnelModel(id, modelUri, mimeType, file) :
			this.instAntiAtionService.creAteInstAnce(DelegAtedOutputChAnnelModel, id, modelUri, mimeType, this.outputDir);
	}

	privAte _outputDir: Promise<URI> | null = null;
	privAte get outputDir(): Promise<URI> {
		if (!this._outputDir) {
			const outputDir = URI.file(join(this.environmentService.logsPAth, `output_${this.nAtiveHostService.windowId}_${toLocAlISOString(new DAte()).replAce(/-|:|\.\d+Z$/g, '')}`));
			this._outputDir = this.fileService.creAteFolder(outputDir).then(() => outputDir);
		}
		return this._outputDir;
	}

}

registerSingleton(IOutputChAnnelModelService, OutputChAnnelModelService);
