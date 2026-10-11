# Неявные приёмы

## Ошибки Query

В `useQuery` / `useMutation` поле `meta.errorMessage` в компоненте не читается. Его забирает кэш в [`src/api/queryClient.tsx`](../src/api/queryClient.tsx):

- `QueryCache.onError` → `query.meta?.errorMessage`
- `MutationCache.onError` → `mutation.meta?.errorMessage`

Дальше `message.error(...)` (antd). Нужен `QueryApp` внутри `AntApp` в [`src/main.tsx`](../src/main.tsx).

`errorText`: если ошибка `ApiError` — текст с сервера; иначе fallback из `meta` (или «Ошибка запроса»). У **query** 401 глотается без тоста.

`fetchUser` в [`src/api/user/user.ts`](../src/api/user/user.ts) сам превращает 401 в `null`, поэтому для этого запроса кэш 401 почти не видит. `meta` сработает на сетевой сбой и не-401.

## Клиент

### API

- `QueryApp` только внутри `AntApp` ([`src/main.tsx`](../src/main.tsx)): иначе нет `App.useApp().message`. Текст задаётся в `meta.errorMessage` у `useQuery` / `useMutation` (например [`App.tsx`](../src/App.tsx)); применяется в `QueryCache.onError` / `MutationCache.onError` ([`src/api/queryClient.tsx`](../src/api/queryClient.tsx)) как `message.error(...)`.
- `secureRequest` ([`src/api/secure.ts`](../src/api/secure.ts)): ошибка расшифровки / устаревший ключ → сброс кэша JWK → новый публичный ключ → шифрование того же `payload` → один повтор `send()`.
- Не-GET без `X-Requested-With: LexiRiseBot` — 403; аватар качается через сырой `fetch` (тело — байты картинки, не JSON; `api()` разбирает только JSON) и ставит заголовок сам ([`src/api/user/avatar.ts`](../src/api/user/avatar.ts)).
- `fetchUser` + 401 → `null` (гость), не ошибка кэша. Сценарий — открыл сайт без сессии (нет cookie `lr_sid` или она протухла).
  `GET /api/user` отвечает 401. `fetchUser` ловит 401 и возвращает `null`, а не `throw`. Для TanStack Query запрос успешен, `data === null`. Кэш не в error, `QueryCache.onError` не зовётся, тоста нет.

### Фронтенд-компоненты

- Formik + antd `Form`: без вложенного `<form>`.
  Нативная отправка ловит antd → `onFinish` → `submitForm()` → валидация и `onSubmit` Formik. antd здесь оболочка, значения и ошибки — у Formik.
- `onFinish={() => void submitForm()}` в [`FirstStep`](../src/components/auth/ui/steps/FirstStep.tsx): `submitForm()` возвращает `Promise`, `onFinish` — синхронный `() => void`. `void` отбрасывает промис как значение возврата стрелки (получается `undefined`), чтобы колбэк совпал с контрактом antd. Отправка при этом идёт.
- `Input.OTP`: автоотправка при вводе 6-й цифры ([`SecondEmailStep`](../src/components/auth/ui/steps/SecondEmailStep.tsx), также [`SecondTotpStep`](../src/components/auth/ui/steps/SecondTotpStep.tsx)).
- Смена режима или идентификатора меняет `key={formKey}` (`${mode}-${identifier}`) в [`AuthPage`](../src/pages/AuthPage.tsx): React снимает дерево формы и монтирует заново — поля Formik и challenge не перетекают в другой вариант.

## Сервер

Кратко; подробности в [Защитах](AUTH.md#защиты).

- Fake-challenge на `/start` при неверном логине/пароле: тот же JSON, строки в `challenges` нет.
- `sleep` 80–180 мс на каждом `/start`, не от факта «есть пользователь».

## Составные компоненты

- `Input.OTP` ([`SecondEmailStep`](../src/components/auth/ui/steps/SecondEmailStep.tsx), [`SecondTotpStep`](../src/components/auth/ui/steps/SecondTotpStep.tsx))
- `Input.Password` ([`FirstStep`](../src/components/auth/ui/steps/FirstStep.tsx))
- `Form.Item`
- `Typography.Text` ([`App.tsx`](../src/App.tsx))
- `Radio.Group` / `Radio.Button` ([`AuthPage`](../src/pages/AuthPage.tsx))
