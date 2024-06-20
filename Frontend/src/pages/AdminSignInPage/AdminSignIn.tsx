import { useContext, useState } from "preact/hooks";
import { useNavigate } from "react-router";
import { CartContext } from "../../context/cart-context";
import { Input } from "../../global_components/Input/Input";

export const AdminSignIn = () => {
  const navigate = useNavigate();
  const ctx = useContext(CartContext);
  const [shouldShowErrors, setShouldShowErrors] = useState(false);
  const [userInfo, setUserInfo] = useState<{
    username: string;
    pass: string;
  }>({ username: "", pass: "" });

  const adminSignIn = async (data: { username: string; pass: string }) => {
    const res = await fetch("http://localhost:5000/admin_signin", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        username: data.username,
        password: data.pass,
      }),
    }).then((res) => res.json());
    console.log(res);

    if (res.data) {
      console.log("התחברת בהצלחה", "success");
      console.log(res.data);
      localStorage.setItem("jwt", res.data.jwt);
      ctx.onSuccessfulSignIn(
        JSON.parse(decodeURIComponent(atob(res.data.user)))
      );
      navigate("/");
    } else {
      if (res.error_message === "invalid admin password") {
        console.log("סיסמת מנהל מערכת שגויה", "error");
        // showToast("סיסמת מנהל מערכת שגויה", "error");
      } else {
        console.log(res.error_message!, "error");
        // showToast(res.error_message!, "error");
      }
    }
  };

  return (
    <>
      <div className={"page-content"}>
        <div className={"add-product-main-title"}>התחברות מנהל</div>
        <div className={"add-product-form"}>
          <div class="baka-input-wrapper">
            <Input
              shouldShowError={shouldShowErrors}
              value={userInfo.username}
              setValue={(value) =>
                setUserInfo({ ...userInfo, username: value })
              }
              title="שם משתמש"
              name="username"
              placeholder="שם משתמש"
              type="string"
              warning="שם משתמש לא יכול להיוךת ריק"
              check={(value) => value !== ""}
            />

            <Input
              shouldShowError={shouldShowErrors}
              value={userInfo.pass}
              setValue={(value) => setUserInfo({ ...userInfo, pass: value })}
              title="סיסמת מנהל"
              placeholder="סיסמת מנהל"
              name="admin-password"
              type="string"
              check={(value) => value !== ""}
              warning="סיסמא לא יכול להיות ריק"
            />
            <div className={"checkout-buttons"}>
              <button
                className={"add-product-submit"}
                onClick={async () => {
                  await adminSignIn(userInfo);
                }}
              >
                התחבר
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};
