import { useNavigate } from "react-router-dom";
import { trpc } from "../lib/trpc";
import HierarchyList from "../components/HierarchyList";

export default function Cameras() {
  const navigate = useNavigate();
  const utils = trpc.useUtils();
  const { data: cameras = [], isLoading } = trpc.cameras.list.useQuery();
  const createMutation = trpc.cameras.create.useMutation({ onSuccess: () => utils.cameras.list.invalidate() });
  const deleteMutation = trpc.cameras.delete.useMutation({ onSuccess: () => utils.cameras.list.invalidate() });
  const updateMutation = trpc.cameras.update.useMutation({ onSuccess: () => utils.cameras.list.invalidate() });
  const copyMutation = trpc.cameras.copy.useMutation({ onSuccess: () => utils.cameras.list.invalidate() });

  return (
    <HierarchyList
      title="카메라 종류"
      breadcrumb={[]}
      items={cameras}
      isLoading={isLoading}
      onItemPress={(item) =>
        navigate(`/browse/lens-groups/${item.id}`, { state: { cameraName: item.name } })
      }
      onAddItem={(name, description) =>
        createMutation.mutateAsync({ name, description }).then(() => {})
      }
      onDeleteItem={(item) => deleteMutation.mutateAsync({ id: item.id }).then(() => {})}
      onRenameItem={(item, newName) =>
        updateMutation.mutateAsync({ id: item.id, name: newName }).then(() => {})
      }
      entityType="camera"
      onPasteItem={(clipId) =>
        copyMutation.mutateAsync({ id: clipId }).then(() => {})
      }
      emptyMessage="카메라 종류가 없습니다"
    />
  );
}
