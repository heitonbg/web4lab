import { useGetListsQuery } from '../api/api.js';
import { Navigate } from 'react-router';
import { useDispatch } from 'react-redux';
import { addList } from '../features/history/commands.js';
import { TextForm } from '../components/TextForm.jsx';
import sharedStyles from '../styles/shared.module.css';
import styles from './HomePage.module.css';

export function HomePage() {
  const dispatch = useDispatch();
  const { firstListId } = useGetListsQuery(undefined, {
    selectFromResult: ({ data }) => ({ firstListId: data?.[0]?.id }),
  });
  if (firstListId) return <Navigate to={`/lists/${firstListId}`} replace />;
  return (
    <section className={styles.welcome}>
      <p className={sharedStyles.eyebrow}>Место для ваших планов</p>
      <div className={styles.emptyIllustration} aria-hidden="true">
        <span>✓</span>
        <i />
        <i />
        <i />
      </div>
      <h1 tabIndex={-1} data-page-title>
        Большие дела
        <br />
        начинаются со списка.
      </h1>
      <p className={sharedStyles.muted}>
        Соберите задачи в одном месте.
        <br />
        Создайте свой первый список — остальное по шагам.
      </p>
      <TextForm
        label="Как назовём список?"
        placeholder="Например, Мои планы"
        button="Создать"
        onSubmit={(title) =>
          dispatch(addList({ id: crypto.randomUUID(), title, createdAt: Date.now() }))
        }
      />
    </section>
  );
}
