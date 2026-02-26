import { useParams, useNavigate, useLocation } from "react-router-dom";
import { trpc } from "../lib/trpc";
import HierarchyList from "../components/HierarchyList";

export default function FilmTypes() {
  const { formatId } = useParams<{ formatId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { cameraName = "", lensName = "", formatName = "" } =
    (location.state as { cameraName?: string; lensName?: string; formatName?: string }) ?? {};
  const id = Number(formatId);
  const utils = trpc.useUtils();
  const { data: films = [], isLoading } = trpc.films.list.useQuery({ formatId: id });
  const createMutation = trpc.films.create.useMutation({ onSuccess: () => utils.films.list.invalidate() });
  const deleteMutation = trpc.films.delete.useMutation({ onSuccess: () => utils.films.list.invalidate() });
  const updateMutation = trpc.films.update.useMutation({ onSuccess: () => utils.films.list.invalidate() });
  const copyMutation = trpc.films.copy.useMutation({ onSuccess: () => utils.films.list.invalidate() });

  return (
    <HierarchyList
      title="필름 종류"
      breadcrumb={[cameraName, lensName, formatName]}
      items={films}
      isLoading={isLoading}
      onItemPress={(item) =>
        navigate(`/browse/paper-brands/${item.id}`, {
          state: { cameraName, lensName, formatName, filmName: item.name },
        })
      }
      onAddItem={(name, description) =>
        createMutation.mutateAsync({ name, description, formatId: id }).then(() => {})
      }
      onDeleteItem={(item) => deleteMutation.mutateAsync({ id: item.id }).then(() => {})}
      onRenameItem={(item, newName) =>
        updateMutation.mutateAsync({ id: item.id, name: newName }).then(() => {})
      }
      onDuplicateItem={(item) =>
        copyMutation.mutateAsync({ id: item.id, formatId: id }).then(() => {})
      }
      emptyMessage="필름 종류가 없습니다"
    />
  );
}
