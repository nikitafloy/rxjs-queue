import { find, firstValueFrom, Subject } from "rxjs";

/* Создать логику, при обращении к одной и той же функции с одним ключом,
 * ждать, когда ключ освободится и только тогда запускать второй вызов */

const subject$ = new Subject();

const keys = {};

const enter = async (key) => {
  if (!keys[key]) {
    keys[key] = 1;
    return;
  }

  const prev = keys[key];

  keys[key]++;

  await wait(key, prev);
};

const quit = (key) => {
  keys[key]--;

  if (keys[key] === 0) {
    delete keys[key];
  }

  subject$.next(key);
};

const wait = (key, prev) => {
  return firstValueFrom(
    subject$.pipe(
      find((value) => {
        return value === key && (!keys[value] || keys[value] === prev);
      })
    )
  );
};

try {
  console.log("Start");

  setTimeout(() => quit(1), 2000);
  // setTimeout(() => quit(1), 2000);

  await Promise.all([enter(1), enter(1), enter(1)]);

  console.log("Promise.all resolved");
} catch (e) {
  console.error(e);
}
