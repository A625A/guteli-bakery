import { provisionOwner } from '../src/server/auth/provision-owner';

function prompt(label: string, masked = false): Promise<string> {
  return new Promise((resolve, reject) => {
    let value = '';
    process.stdout.write(label);
    process.stdin.setRawMode(true);
    process.stdin.resume();

    const finish = () => {
      process.stdin.setRawMode(false);
      process.stdin.pause();
      process.stdin.off('data', onData);
    };
    const onData = (chunk: Buffer) => {
      const character = chunk.toString('utf8');
      if (character === '\u0003') {
        finish();
        reject(new Error('Owner provisioning cancelled.'));
        return;
      }
      if (character === '\r' || character === '\n') {
        finish();
        process.stdout.write('\n');
        resolve(value);
        return;
      }
      if (character === '\u007f') {
        if (value.length > 0) {
          value = value.slice(0, -1);
          process.stdout.write('\b \b');
        }
        return;
      }
      if (character.length === 1 && character >= ' ') {
        value += character;
        process.stdout.write(masked ? '*' : character);
      }
    };

    process.stdin.on('data', onData);
  });
}

async function main() {
  if (
    !process.stdin.isTTY ||
    !process.stdout.isTTY ||
    process.argv.length !== 2
  ) {
    throw new Error(
      'This command requires an interactive terminal and no arguments.',
    );
  }

  const email = await prompt('Correo del propietario: ');
  const name = await prompt('Nombre del propietario: ');
  const password = await prompt('Contraseña (mínimo 14 caracteres): ', true);
  const confirmation = await prompt('Confirma la contraseña: ', true);

  if (password.length < 14) {
    throw new Error('La contraseña debe tener al menos 14 caracteres.');
  }
  if (password !== confirmation)
    throw new Error('Las contraseñas no coinciden.');

  const result = await provisionOwner({ email, name, password });
  process.stdout.write(
    result === 'created'
      ? 'Propietario inicial creado. Configura MFA al iniciar sesión.\n'
      : 'Ya existe una cuenta; no se creó otro propietario inicial.\n',
  );
}

main().catch((error: unknown) => {
  process.stderr.write(
    `${error instanceof Error ? error.message : 'No se pudo crear el propietario.'}\n`,
  );
  process.exitCode = 1;
});
