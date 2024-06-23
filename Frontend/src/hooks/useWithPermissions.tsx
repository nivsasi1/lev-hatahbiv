/*
if a valid user, than it will allow access to component. 
else, it will try to access the user.
else, it will navigate to "/signin" (incase not a production enviroment will redirect to /adminsign, but thats up to signin view)
*/

import { useContext, useEffect } from "preact/hooks";
import { CartContext } from "../context/cart-context";
import { useNavigate } from "react-router-dom";

const useWithPermissions = (requiredPermission: Array<string>) => {
  const ctx = useContext(CartContext);
  const navigate = useNavigate();
  const user = ctx.user;
  useEffect(() => {
    if (user == null || !user) {
      ctx.fetchUser().then((resultUser) => {
        console.log(resultUser);
        if (!resultUser) {
          navigate("/");
        } else {
          if (
            !(
              requiredPermission.findIndex((s) => s == resultUser.role) != -1 ||
              resultUser.role === "0"
            )
          ) {
            navigate("/");
          }
        }
      });
    } else {
      if (
        !(
          requiredPermission.findIndex((s) => s == user.role) != -1 ||
          user.role === "0"
        )
      ) {
        navigate("/");
      }
    }
  }, [user]);
};
export default useWithPermissions;
