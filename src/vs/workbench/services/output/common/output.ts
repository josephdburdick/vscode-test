/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { Event, Emitter } from 'vs/bAse/common/event';
import { Registry } from 'vs/plAtform/registry/common/plAtform';
import { URI } from 'vs/bAse/common/uri';

export const Extensions = {
	OutputChAnnels: 'workbench.contributions.outputChAnnels'
};

export interfAce IOutputChAnnelDescriptor {
	id: string;
	lAbel: string;
	log: booleAn;
	file?: URI;
}

export interfAce IFileOutputChAnnelDescriptor extends IOutputChAnnelDescriptor {
	file: URI;
}

export interfAce IOutputChAnnelRegistry {

	reAdonly onDidRegisterChAnnel: Event<string>;
	reAdonly onDidRemoveChAnnel: Event<string>;

	/**
	 * MAke An output chAnnel known to the output world.
	 */
	registerChAnnel(descriptor: IOutputChAnnelDescriptor): void;

	/**
	 * Returns the list of chAnnels known to the output world.
	 */
	getChAnnels(): IOutputChAnnelDescriptor[];

	/**
	 * Returns the chAnnel with the pAssed id.
	 */
	getChAnnel(id: string): IOutputChAnnelDescriptor | undefined;

	/**
	 * Remove the output chAnnel with the pAssed id.
	 */
	removeChAnnel(id: string): void;
}

clAss OutputChAnnelRegistry implements IOutputChAnnelRegistry {
	privAte chAnnels = new MAp<string, IOutputChAnnelDescriptor>();

	privAte reAdonly _onDidRegisterChAnnel = new Emitter<string>();
	reAdonly onDidRegisterChAnnel: Event<string> = this._onDidRegisterChAnnel.event;

	privAte reAdonly _onDidRemoveChAnnel = new Emitter<string>();
	reAdonly onDidRemoveChAnnel: Event<string> = this._onDidRemoveChAnnel.event;

	public registerChAnnel(descriptor: IOutputChAnnelDescriptor): void {
		if (!this.chAnnels.hAs(descriptor.id)) {
			this.chAnnels.set(descriptor.id, descriptor);
			this._onDidRegisterChAnnel.fire(descriptor.id);
		}
	}

	public getChAnnels(): IOutputChAnnelDescriptor[] {
		const result: IOutputChAnnelDescriptor[] = [];
		this.chAnnels.forEAch(vAlue => result.push(vAlue));
		return result;
	}

	public getChAnnel(id: string): IOutputChAnnelDescriptor | undefined {
		return this.chAnnels.get(id);
	}

	public removeChAnnel(id: string): void {
		this.chAnnels.delete(id);
		this._onDidRemoveChAnnel.fire(id);
	}
}

Registry.Add(Extensions.OutputChAnnels, new OutputChAnnelRegistry());
