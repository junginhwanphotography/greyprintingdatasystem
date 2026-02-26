import { useLocalSearchParams, useRouter } from "expo-router";
import { trpc } from "@/lib/trpc";
import { HierarchyListScreen } from "@/components/HierarchyListScreen";

export default function FilmTypesScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ formatId: string; formatName: string; lensName: string; cameraName: string }>();
  const formatId = Number(params.formatId);
  const utils = trpc.useUtils();

  const { data: films = [], isLoading } = trpc.films.list.useQuery({ formatId });
  const createMutation = trpc.films.create.useMutation({ onSuccess: () => utils.films.list.invalidate() });
  const deleteMutation = trpc.films.delete.useMutation({ onSuccess: () => utils.films.list.invalidate() });
  const updateMutation = trpc.films.update.useMutation({ onSuccess: () => utils.films.list.invalidate() });

  return (
    <HierarchyListScreen
      title="필름 종류"
      breadcrumb={[params.cameraName, params.lensName, params.formatName]}
      items={films}
      isLoading={isLoading}
      onItemPress={(item) =>
        router.push({
          pathname: "/paper-brands",
          params: {
            filmTypeId: item.id,
            filmName: item.name,
            formatName: params.formatName,
            lensName: params.lensName,
            cameraName: params.cameraName,
          },
        })
      }
      onAddItem={(name, description) => createMutation.mutateAsync({ name, description, formatId }).then(() => {})}
      onDeleteItem={(item) => deleteMutation.mutateAsync({ id: item.id }).then(() => {})}
      onRenameItem={(item, newName) => updateMutation.mutateAsync({ id: item.id, name: newName }).then(() => {})}
      emptyMessage="필름 종류가 없습니다"
    />
  );
}
