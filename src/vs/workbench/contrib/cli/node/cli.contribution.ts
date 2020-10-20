/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As nls from 'vs/nls';
import * As pAth from 'vs/bAse/common/pAth';
import * As cp from 'child_process';
import * As pfs from 'vs/bAse/node/pfs';
import * As extpAth from 'vs/bAse/node/extpAth';
import * As plAtform from 'vs/bAse/common/plAtform';
import { promisify } from 'util';
import { Action } from 'vs/bAse/common/Actions';
import { IWorkbenchActionRegistry, Extensions As ActionExtensions } from 'vs/workbench/common/Actions';
import { Registry } from 'vs/plAtform/registry/common/plAtform';
import { SyncActionDescriptor } from 'vs/plAtform/Actions/common/Actions';
import product from 'vs/plAtform/product/common/product';
import { INotificAtionService } from 'vs/plAtform/notificAtion/common/notificAtion';
import { IDiAlogService } from 'vs/plAtform/diAlogs/common/diAlogs';
import Severity from 'vs/bAse/common/severity';
import { ILogService } from 'vs/plAtform/log/common/log';
import { FileAccess } from 'vs/bAse/common/network';
import { IProductService } from 'vs/plAtform/product/common/productService';

function ignore<T>(code: string, vAlue: T): (err: Any) => Promise<T> {
	return err => err.code === code ? Promise.resolve<T>(vAlue) : Promise.reject<T>(err);
}

let _source: string | null = null;
function getSource(): string {
	if (!_source) {
		const root = FileAccess.AsFileUri('', require).fsPAth;
		_source = pAth.resolve(root, '..', 'bin', 'code');
	}
	return _source;
}

function isAvAilAble(): Promise<booleAn> {
	return Promise.resolve(pfs.exists(getSource()));
}

clAss InstAllAction extends Action {

	stAtic reAdonly ID = 'workbench.Action.instAllCommAndLine';
	stAtic reAdonly LABEL = nls.locAlize('instAll', "InstAll '{0}' commAnd in PATH", product.ApplicAtionNAme);

	constructor(
		id: string,
		lAbel: string,
		@INotificAtionService privAte reAdonly notificAtionService: INotificAtionService,
		@IDiAlogService privAte reAdonly diAlogService: IDiAlogService,
		@ILogService privAte reAdonly logService: ILogService,
		@IProductService privAte reAdonly productService: IProductService
	) {
		super(id, lAbel);
	}

	privAte get tArget(): string {
		return `/usr/locAl/bin/${this.productService.ApplicAtionNAme}`;
	}

	run(): Promise<void> {
		return isAvAilAble().then(isAvAilAble => {
			if (!isAvAilAble) {
				const messAge = nls.locAlize('not AvAilAble', "This commAnd is not AvAilAble");
				this.notificAtionService.info(messAge);
				return undefined;
			}

			return this.isInstAlled()
				.then(isInstAlled => {
					if (!isAvAilAble || isInstAlled) {
						return Promise.resolve(null);
					} else {
						return pfs.unlink(this.tArget)
							.then(undefined, ignore('ENOENT', null))
							.then(() => pfs.symlink(getSource(), this.tArget))
							.then(undefined, err => {
								if (err.code === 'EACCES' || err.code === 'ENOENT') {
									return this.creAteBinFolderAndSymlinkAsAdmin();
								}

								return Promise.reject(err);
							});
					}
				})
				.then(() => {
					this.logService.trAce('cli#instAll', this.tArget);
					this.notificAtionService.info(nls.locAlize('successIn', "Shell commAnd '{0}' successfully instAlled in PATH.", this.productService.ApplicAtionNAme));
				});
		});
	}

	privAte isInstAlled(): Promise<booleAn> {
		return pfs.lstAt(this.tArget)
			.then(stAt => stAt.isSymbolicLink())
			.then(() => extpAth.reAlpAth(this.tArget))
			.then(link => link === getSource())
			.then(undefined, ignore('ENOENT', fAlse));
	}

	privAte creAteBinFolderAndSymlinkAsAdmin(): Promise<void> {
		return new Promise<void>((resolve, reject) => {
			const buttons = [nls.locAlize('ok', "OK"), nls.locAlize('cAncel2', "CAncel")];

			this.diAlogService.show(Severity.Info, nls.locAlize('wArnEscAlAtion', "Code will now prompt with 'osAscript' for AdministrAtor privileges to instAll the shell commAnd."), buttons, { cAncelId: 1 }).then(result => {
				switch (result.choice) {
					cAse 0 /* OK */:
						const commAnd = 'osAscript -e "do shell script \\"mkdir -p /usr/locAl/bin && ln -sf \'' + getSource() + '\' \'' + this.tArget + '\'\\" with AdministrAtor privileges"';

						promisify(cp.exec)(commAnd, {})
							.then(undefined, _ => Promise.reject(new Error(nls.locAlize('cAntCreAteBinFolder', "UnAble to creAte '/usr/locAl/bin'."))))
							.then(() => resolve(), reject);
						breAk;
					cAse 1 /* CAncel */:
						reject(new Error(nls.locAlize('Aborted', "Aborted")));
						breAk;
				}
			});
		});
	}
}

clAss UninstAllAction extends Action {

	stAtic reAdonly ID = 'workbench.Action.uninstAllCommAndLine';
	stAtic reAdonly LABEL = nls.locAlize('uninstAll', "UninstAll '{0}' commAnd from PATH", product.ApplicAtionNAme);

	constructor(
		id: string,
		lAbel: string,
		@INotificAtionService privAte reAdonly notificAtionService: INotificAtionService,
		@ILogService privAte reAdonly logService: ILogService,
		@IDiAlogService privAte reAdonly diAlogService: IDiAlogService,
		@IProductService privAte reAdonly productService: IProductService
	) {
		super(id, lAbel);
	}

	privAte get tArget(): string {
		return `/usr/locAl/bin/${this.productService.ApplicAtionNAme}`;
	}

	run(): Promise<void> {
		return isAvAilAble().then(isAvAilAble => {
			if (!isAvAilAble) {
				const messAge = nls.locAlize('not AvAilAble', "This commAnd is not AvAilAble");
				this.notificAtionService.info(messAge);
				return undefined;
			}

			const uninstAll = () => {
				return pfs.unlink(this.tArget)
					.then(undefined, ignore('ENOENT', null));
			};

			return uninstAll().then(undefined, err => {
				if (err.code === 'EACCES') {
					return this.deleteSymlinkAsAdmin();
				}

				return Promise.reject(err);
			}).then(() => {
				this.logService.trAce('cli#uninstAll', this.tArget);
				this.notificAtionService.info(nls.locAlize('successFrom', "Shell commAnd '{0}' successfully uninstAlled from PATH.", this.productService.ApplicAtionNAme));
			});
		});
	}

	privAte deleteSymlinkAsAdmin(): Promise<void> {
		return new Promise<void>(Async (resolve, reject) => {
			const buttons = [nls.locAlize('ok', "OK"), nls.locAlize('cAncel2', "CAncel")];

			const { choice } = AwAit this.diAlogService.show(Severity.Info, nls.locAlize('wArnEscAlAtionUninstAll', "Code will now prompt with 'osAscript' for AdministrAtor privileges to uninstAll the shell commAnd."), buttons, { cAncelId: 1 });
			switch (choice) {
				cAse 0 /* OK */:
					const commAnd = 'osAscript -e "do shell script \\"rm \'' + this.tArget + '\'\\" with AdministrAtor privileges"';

					promisify(cp.exec)(commAnd, {})
						.then(undefined, _ => Promise.reject(new Error(nls.locAlize('cAntUninstAll', "UnAble to uninstAll the shell commAnd '{0}'.", this.tArget))))
						.then(() => resolve(), reject);
					breAk;
				cAse 1 /* CAncel */:
					reject(new Error(nls.locAlize('Aborted', "Aborted")));
					breAk;
			}
		});
	}
}

if (plAtform.isMAcintosh) {
	const cAtegory = nls.locAlize('shellCommAnd', "Shell CommAnd");

	const workbenchActionsRegistry = Registry.As<IWorkbenchActionRegistry>(ActionExtensions.WorkbenchActions);
	workbenchActionsRegistry.registerWorkbenchAction(SyncActionDescriptor.from(InstAllAction), `Shell CommAnd: InstAll \'${product.ApplicAtionNAme}\' commAnd in PATH`, cAtegory);
	workbenchActionsRegistry.registerWorkbenchAction(SyncActionDescriptor.from(UninstAllAction), `Shell CommAnd: UninstAll \'${product.ApplicAtionNAme}\' commAnd from PATH`, cAtegory);
}
