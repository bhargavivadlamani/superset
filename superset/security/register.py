import logging
from flask_appbuilder.fieldwidgets import BS3TextFieldWidget, BS3PasswordFieldWidget
from flask_appbuilder.forms import DynamicForm
from flask_appbuilder.security.registerviews import RegisterUserDBView
from flask_appbuilder.widgets import FormWidget
from flask_babel import lazy_gettext
from wtforms import BooleanField, PasswordField, StringField
from wtforms.validators import DataRequired, Email, EqualTo
from mailchimp_marketing import Client as MailChimpClient #3.0.80
from typing import Optional

logger = logging.getLogger(__name__)

class OrtegeFormWidget(FormWidget):
    template = "appbuilder/general/security/register_form.html"

class RegisterUserDBForm(DynamicForm):
    username = StringField(
        lazy_gettext("User Name"),
        validators=[DataRequired()],
        widget=BS3TextFieldWidget(),
        render_kw={"icon": "fa-solid fa-user"},
    )
    first_name = StringField(
        lazy_gettext("First Name"),
        validators=[DataRequired()],
        widget=BS3TextFieldWidget(),
        render_kw={"icon": "fa-solid fa-font"},
    )
    last_name = StringField(
        lazy_gettext("Last Name"),
        validators=[DataRequired()],
        widget=BS3TextFieldWidget(),
        render_kw={"icon": "fa-solid fa-font"},
    )
    email = StringField(
        lazy_gettext("Email"),
        validators=[DataRequired(), Email()],
        widget=BS3TextFieldWidget(),
        render_kw={"icon": "fa fa-envelope"},
    )
    country = StringField(
        lazy_gettext("Country"),
        widget=BS3TextFieldWidget(),
        render_kw={"icon": "fa-solid fa-globe"},
    )
    password = PasswordField(
        lazy_gettext("Password"),
        description=lazy_gettext(
            "Please use a good password policy,"
            " this application does not check this for you"
        ),
        validators=[DataRequired()],
        widget=BS3PasswordFieldWidget(),
        render_kw={"icon": "fa-solid fa-key"},
    )
    conf_password = PasswordField(
        lazy_gettext("Confirm Password"),
        description=lazy_gettext("Please rewrite the password to confirm"),
        validators=[EqualTo("password", message=lazy_gettext("Passwords must match"))],
        widget=BS3PasswordFieldWidget(),
        render_kw={"icon": "fa-solid fa-key"},
    )
    subscribe = BooleanField(
        lazy_gettext("Marketing Permissions"),
        description="Please select if you would like to join weekly newsletter.",
        #validators=[DataRequired()],
    )
    #recaptcha = RecaptchaField()

class OrtegeRegisterView(RegisterUserDBView):
    mailchimp_client = None
    
    form = RegisterUserDBForm
    edit_widget = OrtegeFormWidget
    form_title = "Subscribe"
    form_template = "appbuilder/general/model/edit.html"

    def get_mailchimp_client(self, key: str, server: str) -> MailChimpClient:
        if self.mailchimp_client is None:
            mailchimp_client = MailChimpClient()
            mailchimp_client.set_config({
                "api_key": key,
                "server": server,
            })
            try:
                mailchimp_client.ping.get()
            except Exception as e:
                logger.warning(f"Error to connect in mailchimp api, {e}")

            self.mailchimp_client = mailchimp_client

        return self.mailchimp_client

    def add_mailchimp(self, form: RegisterUserDBForm, key: str, server: str, list_id: str):
        try:
            mailchimp_client = self.get_mailchimp_client(key, server)
            mailchimp_client.lists.add_list_member(list_id, {
                "email_address":form.email.data,
                "status": "subscribed" if form.subscribe.data else "unsubscribed",
                "merge_fields": {
                    "FNAME": form.first_name.data,
                    "LNAME": form.last_name.data,
                    "COUNTRY1": form.country.data,
                },
                "tags": ["sign-up-form"]
            })
        except Exception as e:
            logger.warning(f"Error to register user in mailchimp, {e}")

    def add_registration(self, username, first_name, last_name, email, password=""):
        """
            Add a registration request for the user.

        :rtype : RegisterUser
        """
        register_user = self.appbuilder.sm.add_register_user(
            username, first_name, last_name, email, password
        )


    def form_post(self, form):
        self.add_form_unique_validations(form)
        self.add_registration(
            username=form.username.data,
            first_name=form.first_name.data,
            last_name=form.last_name.data,
            email=form.email.data,
            password=form.password.data,
        )
        
        mailchimp_api_key: Optional[str] = self.appbuilder.app.config["MAILCHIMP_KEY"]
        mailchimp_server: Optional[str] = self.appbuilder.app.config["MAILCHIMP_SERVER"]
        mailchimp_list: Optional[str] = self.appbuilder.app.config["MAILCHIMP_LIST_ID"]      
        if self.mailchimp_client or (mailchimp_api_key and mailchimp_server and mailchimp_list):
            self.add_mailchimp(form, mailchimp_api_key, mailchimp_server, mailchimp_list)