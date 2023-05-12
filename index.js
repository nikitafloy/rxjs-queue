import { filter, firstValueFrom, Subject } from "rxjs";
import { v4 as uuidv4 } from "uuid";

/* Создать логику, при обращении к одной и той же функции с одним ключом,
 * ждать, когда ключ освободится и только тогда запускать второй вызов */

const subject$ = new Subject();

const keys = {};

const enter = async (key, taskId, priority = 255) => {
  const timestamp = Number(new Date());

  // В очереди никого, сразу входим в очередь и выполняем промис
  if (!keys[key]) {
    keys[key] = [{ id: taskId, timestamp, priority }];
    return;
  }

  // В очереди кто-то есть, занимаем очередь

  // Занимаем очередь
  keys[key].push({ id: taskId, timestamp, priority });

  // Сортируем по приоритету, может мы имеем привелегию в очереди
  // Сравним свой приоритет с другими
  // Обновим текущую очередь по приоритету
  keys[key].sort((a, b) => {
    if (a.priority === b.priority) {
      return a.timestamp - b.timestamp;
    }

    return a.priority - b.priority;
  });

  await wait(key, taskId);
};

const quit = (key, taskId) => {
  keys[key] = keys[key].filter((item) => item.id !== taskId);

  // Очередь пуста, тогда удаляем ее
  // Эвенты рассылать некому
  if (!keys[key].length) {
    delete keys[key];
    return;
  }

  subject$.next(key);
};

const wait = async (key, taskId) => {
  return await firstValueFrom(
    subject$.pipe(
      filter((value) => {
        if (key !== value) {
          return;
        }

        if (!keys[value]) {
          return;
        }

        if (keys[value][0].id !== taskId) {
          return;
        }

        return true;
      })
    )
  );
};

const resolvePromise = async (key, name, args, priority = 255) => {
  const taskId = uuidv4();

  await enter(key, taskId, priority);

  const promise = getPromiseByName(key, name, Object.values(args));

  const r = await promise;

  quit(key, taskId);

  return r;
};

const getPromiseByName = (key, name, args) => {
  switch (name) {
    case "fetchNumber":
      return fetchNumber(...args);
    // case "throwError":
    //   throw new Error("Some error");
    default:
      throw new Error("Function in key with this name is not exists");
  }
};

const fetchNumber = (number, executionTime = 300) => {
  return new Promise((res, rej) => {
    setTimeout(() => {
      console.log(number);
      res(number);
    }, executionTime);
  });
};

try {
  console.log("Start");

  const result = await Promise.all([
    resolvePromise(
      "get number",
      "fetchNumber",
      { number: 1, executionTime: 300 },
      255
    ),
    // resolvePromise(
    //   "get number",
    //   "throwError",
    //   { number: 2, executionTime: 1000 },
    //   255
    // ),
    resolvePromise(
      "get number",
      "fetchNumber",
      { number: 3, executionTime: 300 },
      100
    ),
    resolvePromise(
      "get number",
      "fetchNumber",
      { number: 4, executionTime: 3000 },
      200
    ),
    resolvePromise(
      "get number",
      "fetchNumber",
      { number: 5, executionTime: 3200 },
      0
    ),
    resolvePromise(
      "get number",
      "fetchNumber",
      { number: 6, executionTime: 300 },
      255
    ),
    resolvePromise(
      "get number",
      "fetchNumber",
      { number: 7, executionTime: 300 },
      255
    ),
  ]);

  console.log(result);

  console.log("Promise.all resolved");
} catch (e) {
  console.error(e);
}
