import { useParams, useNavigate, useLocation } from "react-router-dom";
import { trpc } from "../lib/trpc";
import HierarchyList from "../components/HierarchyList";

export default function Formats() {
  const { lensGroupId } = useParams<{ lensGroupId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { cameraName = "", lensName = "" } = (location.state as { cameraName?: string; lensName?: string }) ?? {};
  const id = Number(lensGroupId);
  const utils = trpc.useUtils();
  const { data: fmts = [], isLoading } = trpc.formats.list.useQuery({ lensGroupId: id });
  const createMutation = trpc.formats.create.useMutation({ onSuccess: () => utils.formats.list.invalidate() });
  const deleteMutation = trpc.formats.delete.useMutation({ onSuccess: () => utils.formats.list.invalidate() });
  const updateMutation = trpc.formats.update.useMutation({ onSuccess: () => utils.formats.list.invalidate() });
  const copyMutation = trpc.formats.copy.useMutation({ onSuccess: () => utils.formats.list.invalidate() });

  return (
    <HierarchyList
      title="판형"
      breadcrumb={[cameraName, lensName]}
      items={fmts}
      isLoading={isLoading}
      onItemPress={(item) =>
        navigate(`/browse/film-types/${item.id}`, {
          state: { cameraName, lensName, formatName: item.name },
        })
      }
      onAddItem={(name, description) =>
        createMutation.mutateAsync({ name, description, lensGroupId: id }).then(() => {})
      }
      onDeleteItem={(item) => deleteMutation.mutateAsync({ id: item.id }).then(() => {})}
      onRenameItem={(item, newName) =>
        updateMutation.mutateAsync({ id: item.id, name: newName }).then(() => {})
      }
      onDuplicateItem={(item) =>
        copyMutation.mutateAsync({ id: item.id, lensGroupId: id }).then(() => {})
      }
      emptyMessage="판형이 없습니다"
    />
  );
}
