import { useParams, useNavigate, useLocation } from "react-router-dom";
import { trpc } from "../lib/trpc";
import HierarchyList from "../components/HierarchyList";

export default function LensGroups() {
  const { cameraTypeId } = useParams<{ cameraTypeId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const cameraName = (location.state as { cameraName?: string })?.cameraName ?? "";
  const id = Number(cameraTypeId);
  const utils = trpc.useUtils();
  const { data: lenses = [], isLoading } = trpc.lenses.list.useQuery({ cameraTypeId: id });
  const createMutation = trpc.lenses.create.useMutation({ onSuccess: () => utils.lenses.list.invalidate() });
  const deleteMutation = trpc.lenses.delete.useMutation({ onSuccess: () => utils.lenses.list.invalidate() });
  const updateMutation = trpc.lenses.update.useMutation({ onSuccess: () => utils.lenses.list.invalidate() });
  const copyMutation = trpc.lenses.copy.useMutation({ onSuccess: () => utils.lenses.list.invalidate() });

  return (
    <HierarchyList
      title="렌즈군"
      breadcrumb={[cameraName]}
      items={lenses}
      isLoading={isLoading}
      onItemPress={(item) =>
        navigate(`/browse/formats/${item.id}`, {
          state: { cameraName, lensName: item.name },
        })
      }
      onAddItem={(name, description) =>
        createMutation.mutateAsync({ name, description, cameraTypeId: id }).then(() => {})
      }
      onDeleteItem={(item) => deleteMutation.mutateAsync({ id: item.id }).then(() => {})}
      onRenameItem={(item, newName) =>
        updateMutation.mutateAsync({ id: item.id, name: newName }).then(() => {})
      }
      onDuplicateItem={(item) =>
        copyMutation.mutateAsync({ id: item.id, cameraTypeId: id }).then(() => {})
      }
      emptyMessage="렌즈군이 없습니다"
    />
  );
}
