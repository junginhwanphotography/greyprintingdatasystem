import { useLocalSearchParams, useRouter } from "expo-router";
import { trpc } from "@/lib/trpc";
import { HierarchyListScreen } from "@/components/HierarchyListScreen";

export default function LensGroupsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ cameraTypeId: string; cameraName: string }>();
  const cameraTypeId = Number(params.cameraTypeId);
  const utils = trpc.useUtils();

  const { data: lenses = [], isLoading } = trpc.lenses.list.useQuery({ cameraTypeId });
  const createMutation = trpc.lenses.create.useMutation({ onSuccess: () => utils.lenses.list.invalidate() });
  const deleteMutation = trpc.lenses.delete.useMutation({ onSuccess: () => utils.lenses.list.invalidate() });
  const updateMutation = trpc.lenses.update.useMutation({ onSuccess: () => utils.lenses.list.invalidate() });

  return (
    <HierarchyListScreen
      title="렌즈군"
      breadcrumb={[params.cameraName]}
      items={lenses}
      isLoading={isLoading}
      onItemPress={(item) =>
        router.push({
          pathname: "/formats",
          params: {
            lensGroupId: item.id,
            lensName: item.name,
            cameraName: params.cameraName,
          },
        })
      }
      onAddItem={(name, description) => createMutation.mutateAsync({ name, description, cameraTypeId }).then(() => {})}
      onDeleteItem={(item) => deleteMutation.mutateAsync({ id: item.id }).then(() => {})}
      onRenameItem={(item, newName) => updateMutation.mutateAsync({ id: item.id, name: newName }).then(() => {})}
      emptyMessage="렌즈군이 없습니다"
    />
  );
}
