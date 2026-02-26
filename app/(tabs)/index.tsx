import { useRouter } from "expo-router";
import { trpc } from "@/lib/trpc";
import { HierarchyListScreen } from "@/components/HierarchyListScreen";

export default function CameraTypesScreen() {
  const router = useRouter();
  const utils = trpc.useUtils();

  const { data: cameras = [], isLoading } = trpc.cameras.list.useQuery();
  const createMutation = trpc.cameras.create.useMutation({ onSuccess: () => utils.cameras.list.invalidate() });
  const deleteMutation = trpc.cameras.delete.useMutation({ onSuccess: () => utils.cameras.list.invalidate() });
  const updateMutation = trpc.cameras.update.useMutation({ onSuccess: () => utils.cameras.list.invalidate() });

  return (
    <HierarchyListScreen
      title="카메라 종류"
      breadcrumb={[]}
      items={cameras}
      isLoading={isLoading}
      onItemPress={(item) => router.push({ pathname: "/lens-groups", params: { cameraTypeId: item.id, cameraName: item.name } })}
      onAddItem={(name, description) => createMutation.mutateAsync({ name, description }).then(() => {})}
      onDeleteItem={(item) => deleteMutation.mutateAsync({ id: item.id }).then(() => {})}
      onRenameItem={(item, newName) => updateMutation.mutateAsync({ id: item.id, name: newName }).then(() => {})}
      emptyMessage="카메라 종류가 없습니다"
    />
  );
}
