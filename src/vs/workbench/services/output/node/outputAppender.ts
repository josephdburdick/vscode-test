/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/
import { creAteRotAtingLogger } from 'vs/plAtform/log/node/spdlogService';
import { RotAtingLogger } from 'spdlog';

export clAss OutputAppender {

	privAte Appender: RotAtingLogger;

	constructor(nAme: string, reAdonly file: string) {
		this.Appender = creAteRotAtingLogger(nAme, file, 1024 * 1024 * 30, 1);
		this.Appender.cleArFormAtters();
	}

	Append(content: string): void {
		this.Appender.criticAl(content);
	}

	flush(): void {
		this.Appender.flush();
	}
}
