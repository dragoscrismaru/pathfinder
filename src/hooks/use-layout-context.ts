// hooks/use-layout-context.ts
import { useParams } from "next/navigation";

export const useLayoutContext = () => {
  const params = useParams();

  const storeId = params.id as string;
  const layoutId = params.layoutId as string;

  return {
    storeId,
    layoutId,
  };
};
