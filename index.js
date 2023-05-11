import { find, firstValueFrom, Subject } from "rxjs";
import { v4 as uuidv4 } from "uuid";

/* Создать логику, при обращении к одной и той же функции с одним ключом,
 * ждать, когда ключ освободится и только тогда запускать второй вызов */

const subject$ = new Subject();

const keys = {};

const enter = async (key, taskId, priority = 255) => {
  // В очереди никого, сразу входим в очередь и выполняем промис
  if (!keys[key]) {
    keys[key] = [{ id: taskId, priority }];
    return;
  }

  // В очереди кто-то есть, занимаем очередь

  // Занимаем очередь
  keys[key].push({ taskId, priority });

  // Сортируем по приоритету, может мы имеем привелегию в очереди
  // Сравним свой приоритет с другими
  const sortedByPriority = keys[key].sort((a, b) => {
    return a.priority - b.priority;
  });

  // Обновим текущую очередь по приоритету
  for (let index = 0; index < keys[key].length; index++) {
    keys[key][index] = {
      pos: index + 1,
      priority: sortedByPriority[index].priority,
    };
  }

  // keys[key] = sortedByPriority;

  // За кем мы в очереди в итоге?

  // Ищем себя
  const me = keys[key].find((item) => item.priority >= priority);

  console.log(priority, me);

  await wait(taskId, prev);

  return taskId;
};

const quit = (key, pos) => {
  keys[key] = keys[key].filter((item) => item.pos !== pos);

  subject$.next(key);
};

const wait = (key, prev) => {
  return firstValueFrom(
    subject$.pipe(
      find((value) => {
        console.log(keys[value], "===", prev.pos);

        return value === key && (!keys[value] || keys[value].pos === prev.pos);
      })
    )
  );
};

const resolvePromise = async (promise, key, priority) => {
  const taskId = uuidv4();

  await enter(key, taskId, priority);

  const r = await promise;

  quit(key, taskId);

  console.log(keys[key]);

  return r;
};

try {
  console.log("Start");

  // setTimeout(() => quit(1), 2000);
  // setTimeout(() => quit(1), 1000);
  // setTimeout(() => quit(1), 100);

  const result = await Promise.all([
    resolvePromise(
      new Promise((res, rej) => {
        setTimeout(() => {
          console.log("1");
          res("1");
        }, 800);
      }),
      "get number"
    ),
    resolvePromise(
      new Promise((res, rej) => {
        setTimeout(() => {
          console.log("2");
          res("2");
        }, 1000);
      }),
      "get number"
    ),
    resolvePromise(
      new Promise((res, rej) => {
        setTimeout(() => {
          console.log("3");
          res("3");
        }, 300);
      }),
      "get number"
    ),
    resolvePromise(
      new Promise((res, rej) => {
        setTimeout(() => {
          console.log("4");
          res("4");
        }, 3000);
      }),
      "get number"
    ),
    resolvePromise(
      new Promise((res, rej) => {
        setTimeout(() => {
          console.log("5");
          res("5");
        }, 3200);
      }),
      "get number",
      0
    ),
    resolvePromise(
      new Promise((res, rej) => {
        setTimeout(() => {
          console.log("6");
          res("6");
        }, 300);
      }),
      "get number"
    ),
    resolvePromise(
      new Promise((res, rej) => {
        setTimeout(() => {
          console.log("7");
          res("7");
        }, 300);
      }),
      "get number"
    ),
  ]);

  console.log(result);

  console.log("Promise.all resolved");
} catch (e) {
  console.error(e);
}
